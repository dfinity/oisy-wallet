<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import BuyButton from '$lib/components/buy/BuyButton.svelte';
	import BuyModal from '$lib/components/buy/BuyModal.svelte';
	import {
		HOME_PAGE_ROUTE,
		TOKEN_VIEW_ROUTE,
		TRACK_BUY_TOKEN
	} from '$lib/constants/analytics.contants';
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
			metadata: {
				source: nonNullish($pageToken) ? TOKEN_VIEW_ROUTE : HOME_PAGE_ROUTE,
				token: nonNullish($pageToken) ? $pageToken.symbol : '',
				network: nonNullish($pageToken) ? $pageToken.network.name : ''
			}
		});

		modalStore.openBuy(modalId);
	}}
/>

{#if $modalBuy && $modalStore?.id === modalId}
	<BuyModal />
{/if}
