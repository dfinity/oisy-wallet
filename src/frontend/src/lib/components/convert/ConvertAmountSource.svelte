<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { getContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import ConvertInputAmount from '$lib/components/convert/ConvertInputAmount.svelte';
	import ConvertInputsContainer from '$lib/components/convert/ConvertInputsContainer.svelte';
	import ConvertToken from '$lib/components/convert/ConvertToken.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { ConvertAmountErrorType } from '$lib/types/convert';
	import { validateConvertAmount } from '$lib/utils/convert.utils';
	import { formatToken, formatUSD } from '$lib/utils/format.utils';
	import { getMaxTransactionAmount } from '$lib/utils/token.utils';

	export let sendAmount: number | undefined = undefined;
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

	const setMax = () => {
		if (!isZeroBalance) {
			sendAmount = getMaxTransactionAmount({
				balance: $sourceTokenBalance,
				tokenDecimals: $sourceToken.decimals,
				tokenStandard: $sourceToken.standard
			});
		}
	};

	let convertAmountUSD: number;
	$: convertAmountUSD =
		nonNullish(sendAmount) && nonNullish($sourceTokenExchangeRate)
			? sendAmount * $sourceTokenExchangeRate
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
		class={`rounded px-2 py-0.5 ${isZeroBalance ? 'bg-error-subtle-alt text-error' : 'bg-brand-subtle text-brand-primary'}`}
		on:click|preventDefault={setMax}
		data-tid="convert-amount-source-balance"
	>
		{$i18n.convert.text.max_balance}:
		{formatToken({
			value: $sourceTokenBalance ?? ZERO,
			unitName: $sourceToken.decimals
		})}
		{$sourceToken.symbol}
	</button>
</ConvertInputsContainer>
