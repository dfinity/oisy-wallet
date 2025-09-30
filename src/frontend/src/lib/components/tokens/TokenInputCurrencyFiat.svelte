<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import TokenInputCurrency from '$lib/components/tokens/TokenInputCurrency.svelte';
	import {
		TOKEN_INPUT_CURRENCY_FIAT,
		TOKEN_INPUT_CURRENCY_FIAT_SYMBOL
	} from '$lib/constants/test-ids.constants';
	import {
		currentCurrencyExchangeRate,
		currentCurrencySymbol,
		currentCurrency,
		currentCurrencyDecimals
	} from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import type { OptionAmount } from '$lib/types/send';
	import { formatCurrency } from '$lib/utils/format.utils';

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
		const convertedValue =
			nonNullish(displayValue) &&
			nonNullish(exchangeRate) &&
			nonNullish($currentCurrencyExchangeRate)
				? (Number(displayValue) / exchangeRate) * $currentCurrencyExchangeRate
				: undefined;

		tokenAmount = nonNullish(convertedValue) ? convertedValue.toFixed(tokenDecimals) : undefined;

		dispatch('nnsInput');
	};

	const syncDisplayValueWithTokenAmount = () => {
		const newDisplayValue =
			nonNullish(exchangeRate) && nonNullish(tokenAmount)
				? formatCurrency({
						value: Number(tokenAmount) * exchangeRate,
						currency: $currentCurrency,
						exchangeRate: $currencyExchangeStore,
						language: $currentLanguage,
						hideSymbol: true,
						normalizeSeparators: true
					})
				: undefined;

		if (Number(newDisplayValue) !== Number(displayValue)) {
			displayValue = newDisplayValue;
		}
	};

	$: (tokenAmount, syncDisplayValueWithTokenAmount());
</script>

<TokenInputCurrency
	{name}
	{autofocus}
	decimals={$currentCurrencyDecimals}
	{disabled}
	{error}
	{loading}
	{placeholder}
	styleClass="no-padding"
	testId={TOKEN_INPUT_CURRENCY_FIAT}
	bind:value={displayValue}
	on:nnsInput={handleInput}
	on:focus
	on:blur
>
	{#snippet prefix()}
		<span
			class="duration=[var(--animation-time-short)] pl-3 transition-colors"
			class:text-tertiary={isNullish(displayValue)}
			data-tid={TOKEN_INPUT_CURRENCY_FIAT_SYMBOL}
		>
			{$currentCurrencySymbol}
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
