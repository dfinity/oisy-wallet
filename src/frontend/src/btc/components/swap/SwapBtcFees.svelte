<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import {
		UTXOS_FEE_CONTEXT_KEY,
		type UtxosFeeContext as UtxosFeeContextType
	} from '$btc/stores/utxos-fee.store';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import ModalExpandableValues from '$lib/components/ui/ModalExpandableValues.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		SWAP_AMOUNTS_CONTEXT_KEY,
		type SwapAmountsContext
	} from '$lib/stores/swap-amounts.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import { SwapProvider, type ChainFusionFee } from '$lib/types/swap';
	import { chainFusionFeeSectionFees } from '$lib/utils/chain-fusion-swap.utils';
	import { resolveText } from '$lib/utils/i18n.utils';

	const { sourceToken, sourceTokenExchangeRate } = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const { store: swapAmountsStore } = getContext<SwapAmountsContext>(SWAP_AMOUNTS_CONTEXT_KEY);

	const { store: utxosFeeStore } = getContext<UtxosFeeContextType>(UTXOS_FEE_CONTEXT_KEY);

	// The Bitcoin counterpart of `SwapFees`, which cannot serve this form: it reads the IC
	// token fee context, which only the ICP-source wizard sets. Same rule as there — every
	// fee the user pays on top of the amount, so the total is their whole cost out of balance,
	// while the ones the minter withholds are disclosed in the provider sheet.
	let fees = $derived(
		$swapAmountsStore?.selectedProvider?.provider === SwapProvider.CHAIN_FUSION
			? chainFusionFeeSectionFees($swapAmountsStore.selectedProvider.swapDetails.sourceFees)
			: undefined
	);

	let totalFee = $derived(fees?.reduce((acc, { fee }) => acc + fee, ZERO));

	// A NEAR Intents quote already prices the provider's fees into the receive amount, so
	// the only cost paid on top is the Bitcoin network fee of the deposit; same shape as
	// the network fee the SOL and EVM wizards show for this provider.
	let satoshisFee = $derived(
		$swapAmountsStore?.selectedProvider?.provider === SwapProvider.NEAR_INTENTS
			? $utxosFeeStore?.utxosFee?.feeSatoshis
			: undefined
	);
</script>

{#snippet feeRow({ labelPath, fee, token }: ChainFusionFee)}
	<FeeDisplay
		decimals={token.decimals}
		exchangeRate={$exchanges?.[token.id]?.usd}
		feeAmount={fee}
		symbol={token.symbol}
		zeroAmountLabel={$i18n.fee.text.zero_fee}
	>
		{#snippet label()}{resolveText({ i18n: $i18n, path: labelPath })}{/snippet}
	</FeeDisplay>
{/snippet}

{#if nonNullish(fees) && nonNullish(totalFee) && nonNullish($sourceToken)}
	<!-- A total of one fee is that fee: a collapsible whose only item repeats its header
		 says nothing, so a single row stands on its own under its own label. -->
	{#if fees.length === 1}
		{@render feeRow(fees[0])}
	{:else}
		<ModalExpandableValues>
			{#snippet listHeader()}
				<FeeDisplay
					decimals={$sourceToken.decimals}
					exchangeRate={$sourceTokenExchangeRate}
					feeAmount={totalFee}
					symbol={$sourceToken.symbol}
					zeroAmountLabel={$i18n.fee.text.zero_fee}
				>
					{#snippet label()}{$i18n.swap.text.total_fee}{/snippet}
				</FeeDisplay>
			{/snippet}

			{#snippet listItems()}
				{#each fees as chainFusionFee (chainFusionFee.labelPath)}
					{@render feeRow(chainFusionFee)}
				{/each}
			{/snippet}
		</ModalExpandableValues>
	{/if}
{:else if nonNullish(satoshisFee) && nonNullish($sourceToken)}
	<FeeDisplay
		decimals={$sourceToken.decimals}
		exchangeRate={$sourceTokenExchangeRate}
		feeAmount={satoshisFee}
		symbol={$sourceToken.symbol}
		zeroAmountLabel={$i18n.fee.text.zero_fee}
	>
		{#snippet label()}{$i18n.fee.text.network_fee}{/snippet}
	</FeeDisplay>
{/if}
