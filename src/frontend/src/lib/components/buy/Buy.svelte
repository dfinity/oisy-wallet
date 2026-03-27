<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import BuyButton from '$lib/components/buy/BuyButton.svelte';
	import BuyModal from '$lib/components/buy/BuyModal.svelte';
	import {
		HOME_PAGE_ROUTE,
		TOKEN_VIEW_ROUTE,
		TRACK_BUY_TOKEN
	} from '$lib/constants/analytics.constants';
	import { modalBuy } from '$lib/derived/modal.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { trackEvent } from '$lib/services/analytics.services';
	import { modalStore } from '$lib/stores/modal.store';

	const modalId = Symbol();
</script>

<BuyButton
	onclick={() => {
		trackEvent({
			name: TRACK_BUY_TOKEN,
			metadata: nonNullish($pageToken)
				? {
						source: TOKEN_VIEW_ROUTE,
						token: $pageToken.symbol,
						network: $pageToken.network.name
					}
				: { source: HOME_PAGE_ROUTE }
		});

		modalStore.openBuy(modalId);
	}}
/>

{#if $modalBuy && $modalStore?.id === modalId}
	<BuyModal />
{/if}
