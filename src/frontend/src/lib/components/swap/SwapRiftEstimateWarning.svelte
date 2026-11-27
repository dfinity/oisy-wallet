<script lang="ts">
	import { getContext } from 'svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { SWAP_RIFT_ESTIMATE_WARNING } from '$lib/constants/test-ids.constants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { SwapProvider } from '$lib/types/swap';
	import { slide } from '$lib/utils/transitions.utils';

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	// Follows the selected offer, which a quote refresh can switch to or away from Rift.
	let isRiftOffer = $derived($swapAmountsStore?.selectedProvider?.provider === SwapProvider.RIFT);
</script>

{#if isRiftOffer}
	<div class="mt-4" transition:slide={SLIDE_DURATION}>
		<MessageBox level="warning" styleClass="!mb-0" testId={SWAP_RIFT_ESTIMATE_WARNING}>
			{$i18n.swap.text.rift_estimate_warning}
		</MessageBox>
	</div>
{/if}
