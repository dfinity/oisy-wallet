<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { SwapMappedResult, SwapProvider } from '$lib/types/swap';
	import { formatReceiveOutMinimum } from '$lib/utils/swap.utils';

	interface Props {
		provider: Extract<SwapMappedResult, { provider: SwapProvider.ICP_SWAP }>;
		slippageValue: OptionAmount;
	}

	const { provider, slippageValue }: Props = $props();
	const { destinationToken } = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const formattedMinimum = $derived(
		nonNullish($destinationToken?.decimals) &&
			nonNullish(slippageValue) &&
			nonNullish(provider.receiveAmount)
			? formatReceiveOutMinimum({
					slippageValue,
					receiveAmount: provider.receiveAmount,
					decimals: $destinationToken.decimals
				})
			: undefined
	);
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
