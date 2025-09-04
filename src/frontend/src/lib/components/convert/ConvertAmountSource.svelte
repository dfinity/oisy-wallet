<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
	import TokenInput from '$lib/components/tokens/TokenInput.svelte';
	import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY,
		type TokenActionValidationErrorsContext
	} from '$lib/stores/token-action-validation-errors.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';
	import type { TokenActionErrorType } from '$lib/types/token-action';
	import { getMaxTransactionAmount } from '$lib/utils/token.utils';
	import { validateUserAmount } from '$lib/utils/user-amount.utils';

	export let sendAmount: OptionAmount = undefined;
	export let totalFee: bigint | undefined;
	export let minFee: bigint | undefined = undefined;
	export let ethereumEstimateFee: bigint | undefined = undefined;
	export let exchangeValueUnit: DisplayUnit = 'usd';
	export let inputUnit: DisplayUnit = 'token';

	let errorType: TokenActionErrorType = undefined;

	const { sourceToken, sourceTokenBalance, sourceTokenExchangeRate, balanceForFee, minterInfo } =
		getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	const { setErrorType } = getContext<TokenActionValidationErrorsContext>(
		TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY
	);

	$: (errorType, setErrorType(errorType));

	const customValidate = (userAmount: bigint): TokenActionErrorType =>
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
	$: isZeroBalance = isNullish($sourceTokenBalance) || $sourceTokenBalance === ZERO;

	let maxAmount: string | undefined;
	$: maxAmount = nonNullish(totalFee)
		? getMaxTransactionAmount({
				balance: $sourceTokenBalance,
				fee: totalFee,
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
	 * Reevaluate max amount if a user has used the "Max" button and totalFee is changing.
	 */
	const debounceSetMax = () => {
		if (!amountSetToMax) {
			return;
		}

		debounce(() => setMax(), 500)();
	};
	$: (totalFee, debounceSetMax());
</script>

<TokenInput
	{customValidate}
	displayUnit={inputUnit}
	exchangeRate={$sourceTokenExchangeRate}
	isSelectable={false}
	token={$sourceToken}
	bind:amount={sendAmount}
	bind:errorType
	bind:amountSetToMax
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
		slot="balance"
		class="font-semibold transition-all"
		class:animate-pulse={isNullish(maxAmount)}
		class:text-brand-primary={!isZeroBalance && isNullish(errorType) && nonNullish(maxAmount)}
		class:text-error-primary={isZeroBalance || nonNullish(errorType)}
		class:text-tertiary={isNullish(maxAmount)}
		data-tid="convert-amount-source-balance"
		on:click|preventDefault={setMax}
	>
		{$i18n.convert.text.max_balance}:
		{nonNullish(maxAmount)
			? `${maxAmount} ${$sourceToken.symbol}`
			: $i18n.convert.text.calculating_max_amount}
	</button>
</TokenInput>
