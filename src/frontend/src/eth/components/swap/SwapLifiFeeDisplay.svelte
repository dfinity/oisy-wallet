<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import { ETH_FEE_CONTEXT_KEY, type EthFeeContext } from '$eth/stores/eth-fee.store';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';

	interface Props {
		// LI.FI's network fee as the swap wizard prices it — the swap transaction's ceiling and its
		// approvals — rather than the fee context's estimate of a plain transfer.
		fee: bigint | undefined;
		label?: Snippet;
	}

	let { fee, label }: Props = $props();

	const { feeSymbolStore, feeDecimalsStore, feeExchangeRateStore }: EthFeeContext =
		getContext<EthFeeContext>(ETH_FEE_CONTEXT_KEY);
</script>

{#if nonNullish($feeSymbolStore) && nonNullish($feeDecimalsStore)}
	<FeeDisplay
		decimals={$feeDecimalsStore}
		exchangeRate={$feeExchangeRateStore}
		feeAmount={fee}
		{label}
		symbol={$feeSymbolStore}
	/>
{/if}
