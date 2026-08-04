<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { page } from '$app/state';
	import GiftCodeRedeemResultModal from '$lib/components/gift-code/GiftCodeRedeemResultModal.svelte';
	import VipRewardStateModal from '$lib/components/vip/VipRewardStateModal.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import {
		modalGiftCodeRedeemResult,
		modalGiftCodeRedeemResultData,
		modalVipRewardState,
		modalVipRewardStateData
	} from '$lib/derived/modal.derived';
	import { QrCodeType } from '$lib/enums/qr-code-types';
	import { getGiftCodeInfo, redeemGiftCode } from '$lib/services/gift-code.services';
	import { claimVipReward, setReferrer } from '$lib/services/reward.services';
	import { initialLoading } from '$lib/stores/loader.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { hasUrlCode } from '$lib/stores/url-code.store';
	import { removeSearchParam } from '$lib/utils/nav.utils';

	const modalId = Symbol();
	const giftModalId = Symbol();

	$effect(() => {
		const handleSearchParams = async () => {
			if (!$initialLoading && page.url.searchParams.has('code') && nonNullish($authIdentity)) {
				const rewardCode = page.url.searchParams.get('code');
				if (nonNullish(rewardCode)) {
					hasUrlCode.set(true);

					const result = await claimVipReward({ identity: $authIdentity, code: rewardCode });

					removeSearchParam({ url: page.url, searchParam: 'code' });
					modalStore.openVipRewardState({
						id: modalId,
						data: {
							success: result.success,
							codeType: result.campaignId ?? QrCodeType.VIP
						}
					});
				}
			}

			if (!$initialLoading && page.url.searchParams.has('gift') && nonNullish($authIdentity)) {
				const giftCode = page.url.searchParams.get('gift');
				if (nonNullish(giftCode)) {
					const info = await getGiftCodeInfo({ identity: $authIdentity, code: giftCode });
					const result = await redeemGiftCode({ identity: $authIdentity, code: giftCode });

					removeSearchParam({ url: page.url, searchParam: 'gift' });
					modalStore.openGiftCodeRedeemResult({
						id: giftModalId,
						data: {
							success: result.success,
							code: giftCode,
							tokens: info?.tokens,
							error: result.error
						}
					});
				}
			}

			if (!$initialLoading && page.url.searchParams.has('referrer') && nonNullish($authIdentity)) {
				const referrerCode = page.url.searchParams.get('referrer');
				if (nonNullish(referrerCode)) {
					const numericalReferrerCode = Number(referrerCode);
					if (!isNaN(numericalReferrerCode)) {
						await setReferrer({ identity: $authIdentity, referrerCode: numericalReferrerCode });
					}
					removeSearchParam({ url: page.url, searchParam: 'referrer' });
				}
			}
		};

		handleSearchParams();
	});
</script>

{#if $modalVipRewardState && nonNullish($modalVipRewardStateData)}
	<VipRewardStateModal
		codeType={$modalVipRewardStateData.codeType}
		isSuccessful={$modalVipRewardStateData.success}
	/>
{:else if $modalGiftCodeRedeemResult && nonNullish($modalGiftCodeRedeemResultData)}
	<GiftCodeRedeemResultModal data={$modalGiftCodeRedeemResultData} />
{/if}
