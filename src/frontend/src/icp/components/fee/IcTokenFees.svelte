<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
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

	export let networkId: NetworkId | undefined = undefined;
	export let sourceToken: Token;
	export let sourceTokenExchangeRate: number | undefined = undefined;
	export let totalSourceTokenFee: bigint | undefined = undefined;
	export let totalDestinationTokenFee: bigint | undefined = undefined;
	export let ethereumEstimateFee: bigint | undefined = undefined;

	const { store: bitcoinStoreFeeData } = getContext<BitcoinFeeContext>(BITCOIN_FEE_CONTEXT_KEY);
	const { store: ethereumStoreFeeData } = getContext<EthereumFeeContext>(ETHEREUM_FEE_CONTEXT_KEY);

	let icTokenFee: bigint | undefined;
	$: icTokenFee = (sourceToken as IcToken).fee;

	let ckBTC = false;
	$: ckBTC = isTokenCkBtcLedger(sourceToken);

	let btcNetwork = false;
	$: btcNetwork = isNetworkIdBitcoin(networkId);

	let bitcoinEstimatedFee: bigint | undefined = undefined;
	$: bitcoinEstimatedFee =
		nonNullish($bitcoinStoreFeeData) && nonNullish($bitcoinStoreFeeData.bitcoinFee)
			? $bitcoinStoreFeeData.bitcoinFee.bitcoin_fee + $bitcoinStoreFeeData.bitcoinFee.minter_fee
			: undefined;

	let kytFee: bigint | undefined = undefined;
	$: kytFee =
		ckBTC && btcNetwork ? $ckBtcMinterInfoStore?.[sourceToken.id]?.data.kyt_fee : undefined;

	let ethereumFeeToken: Token;
	$: ethereumFeeToken = $ethereumFeeTokenCkEth ?? $ckEthereumNativeToken;

	$: ethereumEstimateFee = $ethereumStoreFeeData?.maxTransactionFee;

	let ethereumFeeExchangeRate: number | undefined;
	$: ethereumFeeExchangeRate = $exchanges?.[ethereumFeeToken.id]?.usd;

	let bitcoinFeeExchangeRate: number | undefined;
	$: bitcoinFeeExchangeRate = $exchanges?.[BTC_MAINNET_TOKEN_ID]?.usd;

	$: totalSourceTokenFee = icTokenFee;
	$: totalDestinationTokenFee = bitcoinEstimatedFee;
</script>

<FeeDisplay
	feeAmount={icTokenFee}
	decimals={sourceToken.decimals}
	exchangeRate={sourceTokenExchangeRate}
	symbol={sourceToken.symbol}
	zeroAmountLabel={$i18n.fee.text.zero_fee}
>
	<svelte:fragment slot="label">{$i18n.fee.text.fee}</svelte:fragment>
</FeeDisplay>

{#if nonNullish(bitcoinEstimatedFee)}
	<FeeDisplay
		feeAmount={bitcoinEstimatedFee}
		decimals={BTC_DECIMALS}
		exchangeRate={bitcoinFeeExchangeRate}
		symbol={BTC_MAINNET_SYMBOL}
	>
		<svelte:fragment slot="label">{$i18n.fee.text.estimated_btc}</svelte:fragment>
	</FeeDisplay>
{/if}

{#if nonNullish(kytFee)}
	<FeeDisplay
		feeAmount={kytFee}
		decimals={sourceToken.decimals}
		exchangeRate={sourceTokenExchangeRate}
		symbol={sourceToken.symbol}
	>
		<svelte:fragment slot="label">{$i18n.fee.text.estimated_inter_network}</svelte:fragment>
	</FeeDisplay>
{/if}

{#if nonNullish(ethereumEstimateFee)}
	<FeeDisplay
		feeAmount={ethereumEstimateFee}
		decimals={ethereumFeeToken.decimals}
		exchangeRate={ethereumFeeExchangeRate}
		symbol={ethereumFeeToken.symbol}
	>
		<svelte:fragment slot="label">{$i18n.fee.text.estimated_eth}</svelte:fragment>
	</FeeDisplay>
{/if}
