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

	// DEMO BRANCH — NOT FOR MERGE: two buy buttons — the default one opens the widget with an
	// unsigned URL, "Buy S" opens it with the production signed URL (resolved via the backend).
	let signed = $state(false);

	const openBuy = (isSigned: boolean) => {
		signed = isSigned;

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
	};
</script>

<BuyButton onclick={() => openBuy(false)} />
<BuyButton
	buttonLabel="Buy S"
	onclick={() => openBuy(true)}
	testId="buy-tokens-modal-open-button-signed"
/>

{#if $modalBuy && $modalStore?.id === modalId}
	<BuyModal {signed} />
{/if}
