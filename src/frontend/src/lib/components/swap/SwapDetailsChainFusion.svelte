<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { SwapMappedResult, SwapProvider } from '$lib/types/swap';
	import { formatToken } from '$lib/utils/format.utils';

	interface Props {
		provider: Extract<SwapMappedResult, { provider: SwapProvider.CHAIN_FUSION }>;
	}

	const { provider }: Props = $props();

	const { sourceToken } = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	// No fees here, deliberately. This sheet is the provider's identity — name, website and the
	// constraints it imposes — while the fee breakdown belongs to the form's fee section, which
	// carries every component and their total. Splitting the fees across both surfaces meant
	// either duplicating them or leaving each surface incomplete.
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
