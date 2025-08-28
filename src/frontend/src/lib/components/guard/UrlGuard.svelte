<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import VipRewardStateModal from '$lib/components/vip/VipRewardStateModal.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { modalVipRewardState, modalVipRewardStateData } from '$lib/derived/modal.derived';
	import { QrCodeType } from '$lib/enums/qr-code-types';
	import { claimVipReward, setReferrer } from '$lib/services/reward.services';
	import { loading } from '$lib/stores/loader.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { hasUrlCode } from '$lib/stores/url-code.store';
	import { removeSearchParam } from '$lib/utils/nav.utils';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	const modalId = Symbol();

	$effect(() => {
		const handleSearchParams = async () => {
			if (!$loading && page.url.searchParams.has('code') && nonNullish($authIdentity)) {
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

			if (!$loading && page.url.searchParams.has('referrer') && nonNullish($authIdentity)) {
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

{@render children?.()}

{#if $modalVipRewardState && nonNullish($modalVipRewardStateData)}
	<VipRewardStateModal
		codeType={$modalVipRewardStateData.codeType}
		isSuccessful={$modalVipRewardStateData.success}
	/>
{/if}
