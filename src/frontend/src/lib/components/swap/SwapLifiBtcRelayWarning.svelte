<script lang="ts">
	import { getContext } from 'svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { SWAP_LIFI_BTC_RELAY_WARNING } from '$lib/constants/test-ids.constants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { isLifiBtcRelayOffer } from '$lib/services/lifi-btc-binding.services';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
	import { slide } from '$lib/utils/transitions.utils';

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	// Follows the selected offer, which a quote refresh can switch to or away from Relay.
	let isRelayOffer = $derived(isLifiBtcRelayOffer($swapAmountsStore?.selectedProvider));
</script>

{#if isRelayOffer}
	<div class="mt-4" transition:slide={SLIDE_DURATION}>
		<MessageBox level="warning" styleClass="!mb-0" testId={SWAP_LIFI_BTC_RELAY_WARNING}>
			{replaceOisyPlaceholders($i18n.swap.text.lifi_btc_relay_recipient_warning)}
		</MessageBox>
	</div>
{/if}
