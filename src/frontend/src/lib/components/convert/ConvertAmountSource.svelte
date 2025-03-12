<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { getContext } from 'svelte';
	import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ConvertAmountErrorType } from '$lib/types/convert';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import { getMaxTransactionAmount } from '$lib/utils/token.utils';
	import { validateUserAmount } from '$lib/utils/user-amount.utils';

	export let sendAmount: OptionAmount = undefined;
	export let totalFee: bigint | undefined;
	export let minFee: bigint | undefined = undefined;
	export let ethereumEstimateFee: bigint | undefined = undefined;
	export let insufficientFunds: boolean;
	export let insufficientFundsForFee: boolean;
	export let amountLessThanLedgerFee: boolean | undefined = undefined;
	export let minimumAmountNotReached: boolean | undefined = undefined;
	export let unknownMinimumAmount: boolean | undefined = undefined;
	export let minterInfoNotCertified: boolean | undefined = undefined;
	export let exchangeValueUnit: DisplayUnit = 'usd';
	export let inputUnit: DisplayUnit = 'token';

	let errorType: ConvertAmountErrorType = undefined;

	$: insufficientFunds = nonNullish(errorType) && errorType === 'insufficient-funds';
	$: insufficientFundsForFee = nonNullish(errorType) && errorType === 'insufficient-funds-for-fee';
	$: amountLessThanLedgerFee = nonNullish(errorType) && errorType === 'amount-less-than-ledger-fee';
	$: minimumAmountNotReached = nonNullish(errorType) && errorType === 'minimum-amount-not-reached';
	$: unknownMinimumAmount = nonNullish(errorType) && errorType === 'unknown-minimum-amount';
	$: minterInfoNotCertified = nonNullish(errorType) && errorType === 'minter-info-not-certified';

	const { sourceToken, sourceTokenBalance, sourceTokenExchangeRate, balanceForFee, minterInfo } =
		getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	$: customValidate = (userAmount: BigNumber): ConvertAmountErrorType =>
		validateUserAmount({
			userAmount,
			token: $sourceToken,
			balance: $sourceTokenBalance,
			balanceForFee: $balanceForFee,
			ethereumEstimateFee,
			minterInfo: $minterInfo,
			// If ETH, the balance should cover the user entered amount plus the min gas fee
			// If other tokens - the balance plus total (max) fee
			fee: isSupportedEthTokenId($sourceToken.id) ? minFee : totalFee
		});

	let isZeroBalance: boolean;
	$: isZeroBalance = isNullish($sourceTokenBalance) || $sourceTokenBalance.isZero();

	let maxAmount: number | undefined;
	$: maxAmount = nonNullish(totalFee)
		? getMaxTransactionAmount({
				balance: $sourceTokenBalance,
				fee: BigNumber.from(totalFee),
				tokenDecimals: $sourceToken.decimals,
				tokenStandard: $sourceToken.standard
			})
		: undefined;

	let amountSetToMax = false;
	const setMax = () => {
		if (!isZeroBalance && nonNullish(maxAmount)) {
			amountSetToMax = true;

			sendAmount = maxAmount;
		}
	};

	/**
	 * Reevaluate max amount if user has used the "Max" button and totalFee is changing.
	 */
	const debounceSetMax = () => {
		if (!amountSetToMax) {
			return;
		}

		debounce(() => setMax(), 500)();
	};
	$: totalFee, debounceSetMax();
</script>

<TokenInput
	bind:amount={sendAmount}
	displayUnit={inputUnit}
	exchangeRate={$sourceTokenExchangeRate}
	bind:errorType
	bind:amountSetToMax
	token={$sourceToken}
	isSelectable={false}
	{customValidate}
>
	<div slot="amount-info" class="text-tertiary">
		<TokenInputAmountExchange
			amount={sendAmount}
			exchangeRate={$sourceTokenExchangeRate}
			token={$sourceToken}
			bind:displayUnit={exchangeValueUnit}
		/>
	</div>

	<button
		on:click|preventDefault={setMax}
		slot="balance"
		class="font-semibold transition-all"
		class:text-brand-primary={!isZeroBalance && isNullish(errorType) && nonNullish(maxAmount)}
		class:text-error-primary={isZeroBalance || nonNullish(errorType)}
		class:text-tertiary={isNullish(maxAmount)}
		class:animate-pulse={isNullish(maxAmount)}
		data-tid="convert-amount-source-balance"
	>
		{$i18n.convert.text.max_balance}:
		{nonNullish(maxAmount)
			? `${maxAmount} ${$sourceToken.symbol}`
			: $i18n.convert.text.calculating_max_amount}
	</button>
</TokenInput>
