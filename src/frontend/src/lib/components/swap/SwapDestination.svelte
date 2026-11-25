<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { NEAR_INTENTS_SWAP_ENABLED } from '$env/rest/near-intents.env';
	import DestinationValue from '$lib/components/address/DestinationValue.svelte';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import {
		SWAP_DESTINATION,
		SWAP_DESTINATION_CHANGE,
		SWAP_DESTINATION_RESET
	} from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import {
		SWAP_DESTINATION_PICKER_CONTEXT_KEY,
		type SwapDestinationPickerContext
	} from '$lib/stores/swap-destination-picker.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import { SwapProvider } from '$lib/types/swap';
	import { isSwapCustomDestinationNetworkId } from '$lib/utils/swap.utils';
	import { slide } from '$lib/utils/transitions.utils';

	const { destinationToken, customDestination, setCustomDestination } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	const picker = getContext<SwapDestinationPickerContext | undefined>(
		SWAP_DESTINATION_PICKER_CONTEXT_KEY
	);

	let isNearIntentsSelected = $derived(
		NEAR_INTENTS_SWAP_ENABLED &&
			$swapAmountsStore?.selectedProvider?.provider === SwapProvider.NEAR_INTENTS
	);

	// Only NEAR Intents pays out to another address, so the row comes with its offer. It stays while
	// an address is set: NEAR Intents is then the only provider asked, and when it has no offer the
	// address that explains why must stay in sight.
	let show = $derived(
		nonNullish(picker) &&
			isSwapCustomDestinationNetworkId($destinationToken?.network.id) &&
			(isNearIntentsSelected || nonNullish($customDestination))
	);
</script>

{#if show && nonNullish(picker) && nonNullish($destinationToken)}
	<div class="mt-4" data-tid={SWAP_DESTINATION} transition:slide>
		<DestinationValue
			destination={$customDestination}
			isDestinationCustom={nonNullish($customDestination)}
			token={$destinationToken}
		>
			{#if nonNullish($customDestination)}
				<ButtonIcon
					ariaLabel={$i18n.swap.alt.reset_destination}
					onclick={() => setCustomDestination(undefined)}
					testId={SWAP_DESTINATION_RESET}
				>
					{#snippet icon()}<span aria-hidden="true"><IconClose size="16" /></span>{/snippet}
				</ButtonIcon>
			{/if}

			<button
				class="text-brand-primary transition-colors duration-150 ease-out press hover:text-brand-hover active:text-brand-hover"
				aria-label={$i18n.core.text.change}
				data-tid={SWAP_DESTINATION_CHANGE}
				onclick={picker.showDestinationPicker}
			>
				{$i18n.core.text.change} >
			</button>
		</DestinationValue>
	</div>
{/if}
