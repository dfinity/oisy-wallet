<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { run, preventDefault } from 'svelte/legacy';
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

	interface Props {
		sendAmount?: OptionAmount;
		totalFee: bigint | undefined;
		minFee?: bigint;
		ethereumEstimateFee?: bigint;
		exchangeValueUnit?: DisplayUnit;
		inputUnit?: DisplayUnit;
	}

	let {
		sendAmount = $bindable(),
		totalFee,
		minFee = undefined,
		ethereumEstimateFee = undefined,
		exchangeValueUnit = $bindable('usd'),
		inputUnit = 'token'
	}: Props = $props();

	let errorType: TokenActionErrorType = $state(undefined);

	const { sourceToken, sourceTokenBalance, sourceTokenExchangeRate, balanceForFee, minterInfo } =
		getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	const { setErrorType } = getContext<TokenActionValidationErrorsContext>(
		TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY
	);

	run(() => {
		(errorType, setErrorType(errorType));
	});

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

	let isZeroBalance: boolean = $derived(
		isNullish($sourceTokenBalance) || $sourceTokenBalance === ZERO
	);

	let maxAmount: string | undefined = $state();
	run(() => {
		maxAmount = nonNullish(totalFee)
			? getMaxTransactionAmount({
					balance: $sourceTokenBalance,
					fee: totalFee,
					tokenDecimals: $sourceToken.decimals,
					tokenStandard: $sourceToken.standard
				})
			: undefined;
	});

	let amountSetToMax = $state(false);
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
	run(() => {
		(totalFee, debounceSetMax());
	});
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
	<!-- @migration-task: migrate this slot by hand, `amount-info` is an invalid identifier -->
	<!-- @migration-task: migrate this slot by hand, `amount-info` is an invalid identifier -->
	<!-- @migration-task: migrate this slot by hand, `amount-info` is an invalid identifier -->
	<div slot="amount-info" class="text-tertiary">
		<TokenInputAmountExchange
			amount={sendAmount}
			exchangeRate={$sourceTokenExchangeRate}
			token={$sourceToken}
			bind:displayUnit={exchangeValueUnit}
		/>
	</div>

	{#snippet balance()}
		<button
			onclick={preventDefault(setMax)}
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
	{/snippet}
</TokenInput>
