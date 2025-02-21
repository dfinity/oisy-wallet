<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { getContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import { BITCOIN_FEE_CONTEXT_KEY, type BitcoinFeeContext } from '$icp/stores/bitcoin-fee.store';
	import ExchangeAmountDisplay from '$lib/components/exchange/ExchangeAmountDisplay.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';

	const { store: storeFeeData } = getContext<BitcoinFeeContext>(BITCOIN_FEE_CONTEXT_KEY);
	const { sendTokenDecimals, sendTokenSymbol, sendTokenExchangeRate } =
		getContext<SendContext>(SEND_CONTEXT_KEY);

	let bitcoinEstimatedFee: bigint | undefined;
	$: bitcoinEstimatedFee =
		nonNullish($storeFeeData) && nonNullish($storeFeeData.bitcoinFee)
			? $storeFeeData.bitcoinFee.bitcoin_fee + $storeFeeData.bitcoinFee.minter_fee
			: undefined;
</script>

{#if nonNullish(bitcoinEstimatedFee)}
	<div transition:slide={SLIDE_DURATION}>
		<Value ref="kyt-fee">
			<svelte:fragment slot="label">{$i18n.fee.text.estimated_btc}</svelte:fragment>

			<ExchangeAmountDisplay
				amount={BigNumber.from(bitcoinEstimatedFee)}
				decimals={$sendTokenDecimals}
				symbol={$sendTokenSymbol}
				exchangeRate={$sendTokenExchangeRate}
			/>
		</Value>
	</div>
{/if}
