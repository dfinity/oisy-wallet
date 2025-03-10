<script lang="ts">
	import { fromNullable, nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { getContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import IcTokenFees from '$icp/components/fee/IcTokenFees.svelte';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import { isTokenCkBtcLedger } from '$icp/utils/ic-send.utils';
	import { ckEthereumNativeTokenId } from '$icp-eth/derived/cketh.derived';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import ConvertForm from '$lib/components/convert/ConvertForm.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionBtcAddress, OptionEthAddress } from '$lib/types/address';
	import type { OptionAmount } from '$lib/types/send';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';

	export let sendAmount: OptionAmount;
	export let receiveAmount: number | undefined;
	export let destination: OptionBtcAddress | OptionEthAddress = '';

	const { sourceToken, sourceTokenExchangeRate, destinationToken } =
		getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	let insufficientFunds: boolean;
	let insufficientFundsForFee: boolean;
	let amountLessThanLedgerFee: boolean;
	let minimumAmountNotReached: boolean;
	let unknownMinimumAmount: boolean;
	let minterInfoNotCertified: boolean;

	let invalid: boolean;
	$: invalid =
		insufficientFunds ||
		insufficientFundsForFee ||
		amountLessThanLedgerFee ||
		minimumAmountNotReached ||
		unknownMinimumAmount ||
		minterInfoNotCertified ||
		invalidAmount(sendAmount) ||
		isNullishOrEmpty(destination);

	let isCkBtc: boolean;
	$: isCkBtc = isTokenCkBtcLedger($sourceToken);

	let formattedMinterMinimumAmount: string | undefined;
	$: formattedMinterMinimumAmount = formatToken({
		value: BigNumber.from(
			isCkBtc
				? ($ckBtcMinterInfoStore?.[$sourceToken.id]?.data.retrieve_btc_min_amount ?? 0n)
				: (fromNullable(
						$ckEthMinterInfoStore?.[$ckEthereumNativeTokenId]?.data.minimum_withdrawal_amount ?? []
					) ?? 0n)
		),
		unitName: $sourceToken.decimals,
		displayDecimals: $sourceToken.decimals
	});

	let totalSourceTokenFee: bigint | undefined;
	let ethereumEstimateFee: bigint | undefined;

	let errorMessage: string | undefined;
	$: errorMessage = unknownMinimumAmount
		? replacePlaceholders($i18n.send.assertion.unknown_minimum_ckbtc_amount, {
				$sourceTokenSymbol: $sourceToken.symbol,
				$destinationTokenSymbol: $destinationToken.symbol
			})
		: amountLessThanLedgerFee
			? replacePlaceholders($i18n.send.assertion.minimum_ledger_fees, {
					$symbol: $sourceToken.symbol
				})
			: minimumAmountNotReached
				? replacePlaceholders($i18n.send.assertion.minimum_amount, {
						$symbol: $sourceToken.symbol,
						$amount: formattedMinterMinimumAmount
					})
				: undefined;

	let infoMessage: string | undefined;
	$: infoMessage = minterInfoNotCertified
		? isCkBtc
			? $i18n.send.info.ckbtc_certified
			: $i18n.send.info.cketh_certified
		: undefined;
</script>

<ConvertForm
	on:icNext
	bind:sendAmount
	bind:receiveAmount
	bind:insufficientFunds
	bind:insufficientFundsForFee
	bind:amountLessThanLedgerFee
	bind:minimumAmountNotReached
	bind:unknownMinimumAmount
	bind:minterInfoNotCertified
	{ethereumEstimateFee}
	totalFee={totalSourceTokenFee}
	disabled={invalid}
>
	<svelte:fragment slot="message">
		{#if nonNullish(errorMessage) || nonNullish(infoMessage)}
			<div in:fade>
				<MessageBox level={nonNullish(errorMessage) ? 'error' : 'info'}>
					{errorMessage ?? infoMessage}
				</MessageBox>
			</div>
		{/if}
	</svelte:fragment>

	<IcTokenFees
		slot="fee"
		bind:totalSourceTokenFee
		bind:ethereumEstimateFee
		sourceToken={$sourceToken}
		sourceTokenExchangeRate={$sourceTokenExchangeRate}
		networkId={$destinationToken.network.id}
	/>

	<slot name="cancel" slot="cancel" />
</ConvertForm>
