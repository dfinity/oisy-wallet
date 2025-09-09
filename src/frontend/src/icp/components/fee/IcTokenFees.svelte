<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { run } from 'svelte/legacy';
	import {
		BTC_DECIMALS,
		BTC_MAINNET_SYMBOL,
		BTC_MAINNET_TOKEN_ID
	} from '$env/tokens/tokens.btc.env';
	import { ethereumFeeTokenCkEth } from '$icp/derived/ethereum-fee.derived';
	import { BITCOIN_FEE_CONTEXT_KEY, type BitcoinFeeContext } from '$icp/stores/bitcoin-fee.store';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import {
		ETHEREUM_FEE_CONTEXT_KEY,
		type EthereumFeeContext
	} from '$icp/stores/ethereum-fee.store';
	import type { IcToken } from '$icp/types/ic-token';
	import { isTokenCkBtcLedger } from '$icp/utils/ic-send.utils';
	import { ckEthereumNativeToken } from '$icp-eth/derived/cketh.derived';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { NetworkId } from '$lib/types/network';
	import type { Token } from '$lib/types/token';
	import { isNetworkIdBitcoin } from '$lib/utils/network.utils';

	interface Props {
		networkId?: NetworkId;
		sourceToken: Token;
		sourceTokenExchangeRate?: number;
		totalSourceTokenFee?: bigint;
		totalDestinationTokenFee?: bigint;
		ethereumEstimateFee?: bigint;
	}

	let {
		networkId = undefined,
		sourceToken,
		sourceTokenExchangeRate = undefined,
		totalSourceTokenFee = $bindable(),
		totalDestinationTokenFee = $bindable(),
		ethereumEstimateFee = $bindable()
	}: Props = $props();

	const { store: bitcoinStoreFeeData } = getContext<BitcoinFeeContext>(BITCOIN_FEE_CONTEXT_KEY);
	const { store: ethereumStoreFeeData } = getContext<EthereumFeeContext>(ETHEREUM_FEE_CONTEXT_KEY);

	let icTokenFee: bigint | undefined = $derived((sourceToken as IcToken).fee);

	let ckBTC = $state(false);
	run(() => {
		ckBTC = isTokenCkBtcLedger(sourceToken);
	});

	let btcNetwork = $state(false);
	run(() => {
		btcNetwork = isNetworkIdBitcoin(networkId);
	});

	let bitcoinEstimatedFee: bigint | undefined = $state(undefined);
	run(() => {
		bitcoinEstimatedFee =
			nonNullish($bitcoinStoreFeeData) && nonNullish($bitcoinStoreFeeData.bitcoinFee)
				? $bitcoinStoreFeeData.bitcoinFee.bitcoin_fee + $bitcoinStoreFeeData.bitcoinFee.minter_fee
				: undefined;
	});

	let kytFee: bigint | undefined = $state(undefined);
	run(() => {
		kytFee =
			ckBTC && btcNetwork ? $ckBtcMinterInfoStore?.[sourceToken.id]?.data.kyt_fee : undefined;
	});

	let ethereumFeeToken: Token = $derived($ethereumFeeTokenCkEth ?? $ckEthereumNativeToken);

	run(() => {
		ethereumEstimateFee = $ethereumStoreFeeData?.maxTransactionFee;
	});

	let ethereumFeeExchangeRate: number | undefined = $derived(
		$exchanges?.[ethereumFeeToken.id]?.usd
	);

	let bitcoinFeeExchangeRate: number | undefined = $derived(
		$exchanges?.[BTC_MAINNET_TOKEN_ID]?.usd
	);

	run(() => {
		totalSourceTokenFee = icTokenFee;
	});
	run(() => {
		totalDestinationTokenFee = bitcoinEstimatedFee;
	});
</script>

<FeeDisplay
	decimals={sourceToken.decimals}
	exchangeRate={sourceTokenExchangeRate}
	feeAmount={icTokenFee}
	symbol={sourceToken.symbol}
	zeroAmountLabel={$i18n.fee.text.zero_fee}
>
	{#snippet label()}{$i18n.fee.text.fee}{/snippet}
</FeeDisplay>

{#if nonNullish(bitcoinEstimatedFee)}
	<FeeDisplay
		decimals={BTC_DECIMALS}
		exchangeRate={bitcoinFeeExchangeRate}
		feeAmount={bitcoinEstimatedFee}
		symbol={BTC_MAINNET_SYMBOL}
	>
		{#snippet label()}{$i18n.fee.text.estimated_btc}{/snippet}
	</FeeDisplay>
{/if}

{#if nonNullish(kytFee)}
	<FeeDisplay
		decimals={sourceToken.decimals}
		exchangeRate={sourceTokenExchangeRate}
		feeAmount={kytFee}
		symbol={sourceToken.symbol}
	>
		{#snippet label()}{$i18n.fee.text.estimated_inter_network}{/snippet}
	</FeeDisplay>
{/if}

{#if nonNullish(ethereumEstimateFee)}
	<FeeDisplay
		decimals={ethereumFeeToken.decimals}
		exchangeRate={ethereumFeeExchangeRate}
		feeAmount={ethereumEstimateFee}
		symbol={ethereumFeeToken.symbol}
	>
		{#snippet label()}{$i18n.fee.text.estimated_eth}{/snippet}
	</FeeDisplay>
{/if}
