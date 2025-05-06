<script lang="ts">
	// TODO: component will be removed within migration to the new Send flow
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import {
		BTC_DECIMALS,
		BTC_MAINNET_SYMBOL,
		BTC_MAINNET_TOKEN_ID
	} from '$env/tokens/tokens.btc.env';
	import { BITCOIN_FEE_CONTEXT_KEY, type BitcoinFeeContext } from '$icp/stores/bitcoin-fee.store';
	import ExchangeAmountDisplay from '$lib/components/exchange/ExchangeAmountDisplay.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { i18n } from '$lib/stores/i18n.store';

	const { store: storeFeeData } = getContext<BitcoinFeeContext>(BITCOIN_FEE_CONTEXT_KEY);

	let bitcoinEstimatedFee: bigint | undefined;
	$: bitcoinEstimatedFee =
		nonNullish($storeFeeData) && nonNullish($storeFeeData.bitcoinFee)
			? $storeFeeData.bitcoinFee.bitcoin_fee + $storeFeeData.bitcoinFee.minter_fee
			: undefined;

	let btcFeeExchangeRate: number | undefined;
	$: btcFeeExchangeRate = $exchanges?.[BTC_MAINNET_TOKEN_ID]?.usd;
</script>

{#if nonNullish(bitcoinEstimatedFee)}
	<div transition:slide={SLIDE_DURATION}>
		<Value ref="bitcoin-estimated-fee">
			{#snippet label()}
				{$i18n.fee.text.estimated_btc}
			{/snippet}

			{#snippet content()}
				<ExchangeAmountDisplay
					amount={bitcoinEstimatedFee}
					decimals={BTC_DECIMALS}
					symbol={BTC_MAINNET_SYMBOL}
					exchangeRate={btcFeeExchangeRate}
				/>
			{/snippet}
		</Value>
	</div>
{/if}
