<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import TokenInputCurrency from '$lib/components/tokens/TokenInputCurrency.svelte';
	import {
		TOKEN_INPUT_CURRENCY_FIAT,
		TOKEN_INPUT_CURRENCY_FIAT_SYMBOL
	} from '$lib/constants/test-ids.constants';
	import type { OptionAmount } from '$lib/types/send';

	export let tokenAmount: OptionAmount;
	export let tokenDecimals: number;
	export let exchangeRate: number | undefined = undefined;
	export let name = 'token-input-currency-fiat';
	export let disabled = false;
	export let placeholder = '0';
	export let error = false;
	export let loading = false;
	export let autofocus = false;

	let displayValue: OptionAmount;

	const dispatch = createEventDispatcher();

	const handleInput = () => {
		tokenAmount =
			nonNullish(exchangeRate) && nonNullish(displayValue)
				? (Number(displayValue) / exchangeRate).toFixed(tokenDecimals)
				: undefined;

		dispatch('nnsInput');
	};

	const syncDisplayValueWithTokenAmount = () => {
		const newDisplayValue =
			nonNullish(exchangeRate) && nonNullish(tokenAmount)
				? (Number(tokenAmount) * exchangeRate).toFixed(2)
				: undefined;

		if (Number(newDisplayValue) !== Number(displayValue)) {
			displayValue = newDisplayValue;
		}
	};

	$: tokenAmount, syncDisplayValueWithTokenAmount();
</script>

<TokenInputCurrency
	bind:value={displayValue}
	on:nnsInput={handleInput}
	{name}
	{placeholder}
	{disabled}
	{error}
	{loading}
	{autofocus}
	decimals={2}
	on:focus
	on:blur
	testId={TOKEN_INPUT_CURRENCY_FIAT}
	styleClass="no-padding"
>
	{#snippet prefix()}
		<span
			class="duration=[var(--animation-time-short)] pl-3 transition-colors"
			class:text-tertiary={isNullish(displayValue)}
			data-tid={TOKEN_INPUT_CURRENCY_FIAT_SYMBOL}
		>
			$
		</span>
	{/snippet}
	{#snippet innerEnd()}
		<slot name="inner-end" />
	{/snippet}
</TokenInputCurrency>

<style lang="scss">
	:global(.token-input-currency.no-padding div.input-field input[id]) {
		padding: 0 0.75rem 0 0;
	}
</style>
