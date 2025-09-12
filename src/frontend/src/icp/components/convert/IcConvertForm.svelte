<script lang="ts">
	import { fromNullable, nonNullish } from '@dfinity/utils';
	import { type Snippet, createEventDispatcher, getContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import IcTokenFees from '$icp/components/fee/IcTokenFees.svelte';
	import { ethereumFeeTokenCkEth } from '$icp/derived/ethereum-fee.derived';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import { isTokenCkBtcLedger } from '$icp/utils/ic-send.utils';
	import { ckEthereumNativeToken, ckEthereumNativeTokenId } from '$icp-eth/derived/cketh.derived';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import DestinationValue from '$lib/components/address/DestinationValue.svelte';
	import ConvertForm from '$lib/components/convert/ConvertForm.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { IC_CONVERT_FORM_TEST_ID } from '$lib/constants/test-ids.constants';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY,
		type TokenActionValidationErrorsContext
	} from '$lib/stores/token-action-validation-errors.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { invalidAmount, isNullishOrEmpty } from '$lib/utils/input.utils';

	interface Props {
		sendAmount: OptionAmount;
		receiveAmount: number | undefined;
		destination?: string;
		isDestinationCustom?: boolean;
		cancel?: Snippet;
	}

	let {
		sendAmount = $bindable(),
		receiveAmount = $bindable(),
		destination = '',
		isDestinationCustom = false,
		cancel
	}: Props = $props();

	const { sourceToken, sourceTokenExchangeRate, destinationToken, balanceForFee } =
		getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	const {
		insufficientFunds,
		insufficientFundsForFee,
		amountLessThanLedgerFee,
		minimumAmountNotReached,
		unknownMinimumAmount,
		minterInfoNotCertified
	} = getContext<TokenActionValidationErrorsContext>(TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY);

	const dispatch = createEventDispatcher();

	let invalid: boolean = $derived(
		$insufficientFunds ||
			$insufficientFundsForFee ||
			$amountLessThanLedgerFee ||
			$minimumAmountNotReached ||
			$unknownMinimumAmount ||
			$minterInfoNotCertified ||
			invalidAmount(sendAmount) ||
			isNullishOrEmpty(destination)
	);

	let isCkBtc: boolean = $derived(isTokenCkBtcLedger($sourceToken));

	let formattedMinterMinimumAmount: string | undefined = $derived(
		formatToken({
			value: isCkBtc
				? ($ckBtcMinterInfoStore?.[$sourceToken.id]?.data.retrieve_btc_min_amount ?? ZERO)
				: (fromNullable(
						$ckEthMinterInfoStore?.[$ckEthereumNativeTokenId]?.data.minimum_withdrawal_amount ?? []
					) ?? ZERO),
			unitName: $sourceToken.decimals,
			displayDecimals: $sourceToken.decimals
		})
	);

	let totalSourceTokenFee: bigint | undefined = $state();
	let totalDestinationTokenFee: bigint | undefined = $state();
	let ethereumEstimateFee: bigint | undefined = $state();

	let tokenForFee: Token = $derived(
		isCkBtc ? $sourceToken : ($ethereumFeeTokenCkEth ?? $ckEthereumNativeToken)
	);

	let errorMessage: string | undefined = $derived(
		$insufficientFundsForFee
			? replacePlaceholders($i18n.send.assertion.not_enough_tokens_for_gas, {
					$symbol: tokenForFee.symbol,
					$balance: formatToken({
						value: $balanceForFee ?? ZERO,
						unitName: tokenForFee.decimals,
						displayDecimals: tokenForFee.decimals
					})
				})
			: $unknownMinimumAmount
				? replacePlaceholders($i18n.send.assertion.unknown_minimum_ckbtc_amount, {
						$sourceTokenSymbol: $sourceToken.symbol,
						$destinationTokenSymbol: $destinationToken.symbol
					})
				: $amountLessThanLedgerFee
					? replacePlaceholders($i18n.send.assertion.minimum_ledger_fees, {
							$symbol: $sourceToken.symbol
						})
					: $minimumAmountNotReached
						? replacePlaceholders($i18n.send.assertion.minimum_amount, {
								$symbol: $sourceToken.symbol,
								$amount: formattedMinterMinimumAmount
							})
						: undefined
	);

	let infoMessage: string | undefined = $derived(
		$minterInfoNotCertified
			? isCkBtc
				? $i18n.send.info.ckbtc_certified
				: $i18n.send.info.cketh_certified
			: undefined
	);

	const cancel_render = $derived(cancel);
</script>

<ConvertForm
	destinationTokenFee={totalDestinationTokenFee}
	disabled={invalid}
	{ethereumEstimateFee}
	testId={IC_CONVERT_FORM_TEST_ID}
	totalFee={totalSourceTokenFee}
	on:icNext
	bind:sendAmount
	bind:receiveAmount
>
	{#snippet message()}
		{#if nonNullish(errorMessage) || nonNullish(infoMessage)}
			<div in:fade>
				<MessageBox level={nonNullish(errorMessage) ? 'error' : 'info'}>
					{errorMessage ?? infoMessage}
				</MessageBox>
			</div>
		{/if}
	{/snippet}

	{#snippet destination()}
		<DestinationValue {destination} {isDestinationCustom} token={$destinationToken}>
			<button
				class="text-brand-primary hover:text-brand-secondary active:text-brand-secondary"
				aria-label={$i18n.core.text.change}
				onclick={() => dispatch('icDestination')}
			>
				{$i18n.core.text.change} >
			</button>
		</DestinationValue>
	{/snippet}

	{#snippet fee()}
		<IcTokenFees
			networkId={$destinationToken.network.id}
			sourceToken={$sourceToken}
			sourceTokenExchangeRate={$sourceTokenExchangeRate}
			bind:totalSourceTokenFee
			bind:totalDestinationTokenFee
			bind:ethereumEstimateFee
		/>
	{/snippet}

	{#snippet cancel()}
		{@render cancel_render?.()}
	{/snippet}
</ConvertForm>
