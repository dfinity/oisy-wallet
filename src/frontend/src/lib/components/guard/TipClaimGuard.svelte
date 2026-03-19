<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { page } from '$app/state';
	import TipClaimModal from '$lib/components/tip/TipClaimModal.svelte';
	import { TIP_CLAIM_CODE_PARAM, TIP_DEAL_PARAM } from '$lib/constants/routes.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { modalTipClaim, modalTipClaimData } from '$lib/derived/modal.derived';
	import { previewTip } from '$lib/services/tip.services';
	import { initialLoading } from '$lib/stores/loader.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { tipClaimStore } from '$lib/stores/tip.store';
	import { removeSearchParam } from '$lib/utils/nav.utils';

	const modalId = Symbol();

	$effect(() => {
		const handleTipParams = async () => {
			const hasTip = page.url.searchParams.has(TIP_DEAL_PARAM);
			const hasClaim = page.url.searchParams.has(TIP_CLAIM_CODE_PARAM);

			if (!$initialLoading && hasTip && hasClaim && nonNullish($authIdentity)) {
				const dealIdStr = page.url.searchParams.get(TIP_DEAL_PARAM);
				const claimCode = page.url.searchParams.get(TIP_CLAIM_CODE_PARAM);

				if (nonNullish(dealIdStr) && nonNullish(claimCode)) {
					const dealId = BigInt(dealIdStr);

					removeSearchParam({ url: page.url, searchParam: TIP_DEAL_PARAM });
					removeSearchParam({ url: page.url, searchParam: TIP_CLAIM_CODE_PARAM });

					const result = await previewTip({
						identity: $authIdentity,
						dealId
					});

					if (result.success) {
						tipClaimStore.set({
							dealId,
							claimCode,
							preview: result.deal
						});
					} else {
						tipClaimStore.set({
							dealId,
							claimCode,
							error: result.error
						});
					}

					modalStore.openTipClaim({
						id: modalId,
						data: { dealId, claimCode }
					});
				}
			}
		};

		handleTipParams();
	});
</script>

{#if $modalTipClaim && nonNullish($modalTipClaimData)}
	<TipClaimModal />
{/if}
