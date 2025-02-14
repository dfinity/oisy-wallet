<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { getContext } from 'svelte';
	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ConvertAmountErrorType } from '$lib/types/convert';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import { validateConvertAmount } from '$lib/utils/convert.utils';
	import { getMaxTransactionAmount } from '$lib/utils/token.utils';

	export let sendAmount: OptionAmount = undefined;
	export let totalFee: bigint | undefined;
	export let insufficientFunds: boolean;
	export let insufficientFundsForFee: boolean;
	export let exchangeValueUnit: DisplayUnit = 'usd';
	export let inputUnit: DisplayUnit = 'token';

	let errorType: ConvertAmountErrorType = undefined;

	$: insufficientFunds = nonNullish(errorType) && errorType === 'insufficient-funds';
	$: insufficientFundsForFee = nonNullish(errorType) && errorType === 'insufficient-funds-for-fee';

	const { sourceToken, sourceTokenBalance, sourceTokenExchangeRate } =
		getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	$: customValidate = (userAmount: BigNumber): ConvertAmountErrorType =>
		validateConvertAmount({
			userAmount,
			decimals: $sourceToken.decimals,
			balance: $sourceTokenBalance,
			totalFee
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
