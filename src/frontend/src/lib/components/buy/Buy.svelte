<script lang="ts">
	import BuyButton from '$lib/components/buy/BuyButton.svelte';
	import BuyModal from '$lib/components/buy/BuyModal.svelte';
	import { TRACK_BUY_TOKEN } from '$lib/constants/analytics.contants';
	import { modalBuy } from '$lib/derived/modal.derived';
	import { pageToken } from '$lib/derived/page-token.derived';
	import { trackEvent } from '$lib/services/analytics.services';
	import { modalStore } from '$lib/stores/modal.store';
	import { nonNullish } from '@dfinity/utils';

	const modalId = Symbol();

	$effect(() => {
		console.log($pageToken);
	});
</script>

<BuyButton
	onclick={() => {
		trackEvent({
			name: TRACK_BUY_TOKEN,
			metadata: {
				source: nonNullish($pageToken) ? 'tokenView' : 'homepage',
				token: nonNullish($pageToken) ? $pageToken.symbol : ''
				// network: nonNullish($pageToken) ? $pageToken.network : ''
			}
		});

		modalStore.openBuy(modalId);
	}}
/>

{#if $modalBuy && $modalStore?.id === modalId}
	<BuyModal />
{/if}
