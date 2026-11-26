<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { SwapMappedResult, SwapProvider } from '$lib/types/swap';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { riftRouteVenues } from '$lib/utils/rift.utils';

	interface Props {
		provider: Extract<SwapMappedResult, { provider: SwapProvider.RIFT }>;
	}

	const { provider }: Props = $props();

	const { destinationToken } = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	// Rift states no minimum, so the estimate is all there is to show, and it is labelled as one.
	const formattedEstimate = $derived(
		nonNullish($destinationToken?.decimals)
			? formatToken({ value: provider.receiveAmount, unitName: $destinationToken.decimals })
			: undefined
	);

	// Rift's own venue ids: it names no display names for them.
	const venues = $derived(riftRouteVenues(provider.swapDetails));

	// What delivering to the destination chain costs, already taken out of the estimate.
	const executionCost = $derived(BigInt(provider.swapDetails.estimated_execution_cost));
</script>

{#if nonNullish(formattedEstimate) && nonNullish($destinationToken)}
	<ModalValue>
		{#snippet label()}
			{$i18n.swap.text.you_receive_estimate}
		{/snippet}

		{#snippet mainValue()}
			{formattedEstimate} {$destinationToken.symbol}
		{/snippet}
	</ModalValue>
{/if}

{#if venues.length > 0}
	<ModalValue>
		{#snippet label()}
			{$i18n.swap.text.swap_route}
		{/snippet}

		{#snippet mainValue()}
			{replacePlaceholders($i18n.swap.text.rift_route_via, { $venues: venues.join(' → ') })}
		{/snippet}
	</ModalValue>
{/if}

{#if nonNullish($destinationToken)}
	<FeeDisplay
		decimals={$destinationToken.decimals}
		exchangeRate={$exchanges?.[$destinationToken.id]?.usd}
		feeAmount={executionCost}
		symbol={$destinationToken.symbol}
		zeroAmountLabel={$i18n.fee.text.zero_fee}
	>
		{#snippet label()}{$i18n.swap.text.included_network_fees}{/snippet}
	</FeeDisplay>
{/if}

<MessageBox styleClass="sm:text-sm">
	{$i18n.swap.text.rift_estimate_warning}
</MessageBox>
