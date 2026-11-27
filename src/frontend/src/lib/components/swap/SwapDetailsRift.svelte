<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import SwapRiftRoute from '$lib/components/swap/SwapRiftRoute.svelte';
	import Amount from '$lib/components/ui/Amount.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { EIGHT_DECIMALS } from '$lib/constants/app.constants';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { SwapMappedResult, SwapProvider } from '$lib/types/swap';

	interface Props {
		provider: Extract<SwapMappedResult, { provider: SwapProvider.RIFT }>;
	}

	const { provider }: Props = $props();

	const { destinationToken } = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	// What delivering to the destination chain costs, already taken out of the estimate.
	const executionCost = $derived(BigInt(provider.swapDetails.estimated_execution_cost));
</script>

<!-- Rift states no minimum, so the amount is labelled as an estimate, at the offers list's precision,
and the minimum row other providers show says there is none. -->
{#if nonNullish($destinationToken)}
	<ModalValue>
		{#snippet label()}
			{$i18n.swap.text.you_receive_estimate}
		{/snippet}

		{#snippet mainValue()}
			<Amount
				amount={provider.receiveAmount}
				decimals={$destinationToken.decimals}
				symbol={$destinationToken.symbol}
			/>
		{/snippet}
	</ModalValue>
{/if}

<ModalValue>
	{#snippet label()}
		{$i18n.swap.text.expected_minimum}
	{/snippet}

	{#snippet mainValue()}
		{$i18n.swap.text.no_minimum}
	{/snippet}
</ModalValue>

<SwapRiftRoute quote={provider.swapDetails} />

{#if nonNullish($destinationToken)}
	<FeeDisplay
		decimals={$destinationToken.decimals}
		displayDecimals={Math.min($destinationToken.decimals, EIGHT_DECIMALS)}
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
