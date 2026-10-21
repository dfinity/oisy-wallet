<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { SwapMappedResult, SwapProvider } from '$lib/types/swap';
	import { formatCurrency, formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { lifiFeesUsd } from '$lib/utils/lifi-swap.utils';

	interface Props {
		provider: Extract<SwapMappedResult, { provider: SwapProvider.LIFI }>;
	}

	const { provider }: Props = $props();

	const { destinationToken } = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	// LI.FI states the minimum itself — its own slippage applied to its own route — rather than
	// leaving it to be derived from the receive amount.
	const formattedMinimum = $derived(
		nonNullish($destinationToken?.decimals)
			? formatToken({ value: provider.receiveOutMinimum, unitName: $destinationToken.decimals })
			: undefined
	);

	const tool = $derived(provider.swapDetails.toolDetails.name);

	// Zero for a same-chain swap, which settles with its own transaction.
	const estimatedSeconds = $derived(provider.swapDetails.estimate.executionDuration);

	const formattedFees = $derived.by(() => {
		const feesUsd = lifiFeesUsd(provider.swapDetails);

		return nonNullish(feesUsd)
			? formatCurrency({
					value: feesUsd,
					currency: $currentCurrency,
					exchangeRate: $currencyExchangeStore,
					language: $currentLanguage
				})
			: undefined;
	});
</script>

{#if nonNullish(formattedMinimum) && nonNullish($destinationToken?.symbol)}
	<ModalValue>
		{#snippet label()}
			{$i18n.swap.text.expected_minimum}
		{/snippet}

		{#snippet mainValue()}
			{formattedMinimum} {$destinationToken.symbol}
		{/snippet}
	</ModalValue>
{/if}

<ModalValue>
	{#snippet label()}
		{$i18n.swap.text.swap_route}
	{/snippet}

	{#snippet mainValue()}
		{estimatedSeconds > 0
			? replacePlaceholders($i18n.swap.text.lifi_route_via_estimated_time, {
					$tool: tool,
					$minutes: `${Math.ceil(estimatedSeconds / 60)}`
				})
			: replacePlaceholders($i18n.swap.text.lifi_route_via, { $tool: tool })}
	{/snippet}
</ModalValue>

{#if nonNullish(formattedFees)}
	<ModalValue>
		{#snippet label()}
			{$i18n.swap.text.swap_fees}
		{/snippet}

		{#snippet mainValue()}
			{formattedFees}
		{/snippet}
	</ModalValue>
{/if}
