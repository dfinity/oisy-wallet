<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { getContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import ConvertInputAmount from '$lib/components/convert/ConvertInputAmount.svelte';
	import ConvertInputsContainer from '$lib/components/convert/ConvertInputsContainer.svelte';
	import ConvertToken from '$lib/components/convert/ConvertToken.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ConvertAmountErrorType } from '$lib/types/convert';
	import type { OptionAmount } from '$lib/types/send';
	import { validateConvertAmount } from '$lib/utils/convert.utils';
	import { formatUSD } from '$lib/utils/format.utils';
	import { getMaxTransactionAmount } from '$lib/utils/token.utils';

	export let sendAmount: OptionAmount = undefined;
	export let totalFee: bigint | undefined;
	export let insufficientFunds: boolean;
	export let insufficientFundsForFee: boolean;

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

	let convertAmountUSD: number;
	$: convertAmountUSD =
		nonNullish(sendAmount) && nonNullish($sourceTokenExchangeRate)
			? Number(sendAmount) * $sourceTokenExchangeRate
			: 0;
</script>

<ConvertInputsContainer>
	<ConvertToken slot="token-info" token={$sourceToken} />
	<ConvertInputAmount
		slot="amount"
		token={$sourceToken}
		bind:amount={sendAmount}
		{customValidate}
		disabled={isZeroBalance}
		bind:errorType
		bind:amountSetToMax
	/>

	<div slot="amount-info" data-tid="convert-amount-source-amount-info">
		{#if insufficientFunds}
			<div transition:slide={SLIDE_DURATION} class="text-sm text-error">
				{$i18n.convert.assertion.insufficient_funds}
			</div>
		{:else}
			<div transition:slide={SLIDE_DURATION}>
				{formatUSD({ value: convertAmountUSD })}
			</div>
		{/if}
	</div>

	<button
		slot="balance"
		class={`rounded px-2 py-0.5 transition-all ${isZeroBalance ? 'bg-error-subtle-alt text-error' : isNullish(maxAmount) ? 'animate-pulse bg-disabled text-tertiary' : 'bg-brand-subtle text-brand-primary'}`}
		on:click|preventDefault={setMax}
		data-tid="convert-amount-source-balance"
	>
		{$i18n.convert.text.max_balance}:
		{nonNullish(maxAmount)
			? `${maxAmount} ${$sourceToken.symbol}`
			: $i18n.convert.text.calculating_max_amount}
	</button>
</ConvertInputsContainer>
