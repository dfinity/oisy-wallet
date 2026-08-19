<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { SwapMappedResult, SwapProvider } from '$lib/types/swap';
	import { formatToken } from '$lib/utils/format.utils';
	import { resolveText } from '$lib/utils/i18n.utils';

	interface Props {
		provider: Extract<SwapMappedResult, { provider: SwapProvider.CHAIN_FUSION }>;
	}

	const { provider }: Props = $props();

	const { sourceToken } = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const fees = $derived(
		[...provider.swapDetails.sourceFees, ...provider.swapDetails.externalFees].filter(
			({ deductedFromAmount }) => deductedFromAmount === true
		)
	);

	const formattedMinimumAmount = $derived(
		nonNullish(provider.swapDetails.minimumAmount) && nonNullish($sourceToken)
			? formatToken({
					value: provider.swapDetails.minimumAmount,
					unitName: $sourceToken.decimals,
					displayDecimals: $sourceToken.decimals
				})
			: undefined
	);
</script>

{#each fees as { labelPath, fee, token }, index (index)}
	<FeeDisplay
		decimals={token.decimals}
		exchangeRate={$exchanges?.[token.id]?.usd}
		feeAmount={fee}
		symbol={token.symbol}
		zeroAmountLabel={$i18n.fee.text.zero_fee}
	>
		{#snippet label()}{resolveText({ i18n: $i18n, path: labelPath })}{/snippet}
	</FeeDisplay>
{/each}

{#if nonNullish(formattedMinimumAmount) && nonNullish($sourceToken)}
	<ModalValue>
		{#snippet label()}
			{$i18n.swap.text.chain_fusion_minimum_amount}
		{/snippet}

		{#snippet mainValue()}
			{formattedMinimumAmount}
			{$sourceToken.symbol}
		{/snippet}
	</ModalValue>
{/if}
