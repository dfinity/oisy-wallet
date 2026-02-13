<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
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

	interface Props {
		tokenAmount: OptionAmount;
		tokenDecimals: number;
		exchangeRate?: number;
		name?: string;
		disabled?: boolean;
		placeholder?: string;
		error?: boolean;
		loading?: boolean;
		autofocus?: boolean;
		onInput: () => void;
		onBlur: () => void;
		onFocus: () => void;
	}

	let {
		tokenAmount = $bindable(),
		tokenDecimals,
		exchangeRate,
		name = 'token-input-currency-fiat',
		disabled = false,
		placeholder = '0',
		error = false,
		loading = false,
		autofocus = false,
		onInput,
		onBlur,
		onFocus
	}: Props = $props();

	let displayValue = $state<OptionAmount>();

	const handleInput = () => {
		const convertedValue =
			nonNullish(displayValue) &&
			nonNullish(exchangeRate) &&
			nonNullish($currentCurrencyExchangeRate)
				? (Number(displayValue) / exchangeRate) * $currentCurrencyExchangeRate
				: undefined;

		tokenAmount = nonNullish(convertedValue) ? convertedValue.toFixed(tokenDecimals) : undefined;

		onInput();
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

	$effect(() => {
		[tokenAmount];

		syncDisplayValueWithTokenAmount();
	});
</script>

<TokenInputCurrency
	{name}
	{autofocus}
	decimals={$currentCurrencyDecimals}
	{disabled}
	{error}
	{loading}
	{onBlur}
	{onFocus}
	onInput={handleInput}
	{placeholder}
	styleClass="no-padding"
	testId={TOKEN_INPUT_CURRENCY_FIAT}
	bind:value={displayValue}
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
</TokenInputCurrency>

<style lang="scss">
	:global(.token-input-currency.no-padding div.input-field input[id]) {
		padding: 0 0.75rem 0 0;
	}
</style>
