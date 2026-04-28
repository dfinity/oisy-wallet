<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { SwapMappedResult, SwapProvider } from '$lib/types/swap';
	import { formatToken } from '$lib/utils/format.utils';

	interface Props {
		provider: Extract<SwapMappedResult, { provider: SwapProvider.ONE_SEC }>;
	}

	const { provider }: Props = $props();

	const { destinationToken } = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const formattedTransferFee = $derived(
		nonNullish($destinationToken?.decimals)
			? formatToken({
					value: provider.swapDetails.transferFeeInUnits,
					unitName: $destinationToken.decimals
				})
			: undefined
	);

	const formattedProtocolFee = $derived(`${provider.swapDetails.protocolFeeInPercent.toFixed(2)}%`);
</script>

{#if nonNullish(formattedTransferFee) && nonNullish($destinationToken?.symbol)}
	<ModalValue>
		{#snippet label()}
			{$i18n.swap.text.onesec_transfer_fee}
		{/snippet}

		{#snippet mainValue()}
			{formattedTransferFee}
			{$destinationToken.symbol}
		{/snippet}
	</ModalValue>
{/if}

<ModalValue>
	{#snippet label()}
		{$i18n.swap.text.onesec_protocol_fee}
	{/snippet}

	{#snippet mainValue()}
		{formattedProtocolFee}
	{/snippet}
</ModalValue>
