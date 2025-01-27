<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import InputCurrency from '$lib/components/ui/InputCurrency.svelte';
	import {
		SWAP_INPUT_CURRENCY,
		SWAP_INPUT_CURRENCY_USD_SYMBOL
	} from '$lib/constants/test-ids.constants';
	import type { OptionAmount } from '$lib/types/send';
	import type { DisplayUnit } from '$lib/types/swap';

	export let value: OptionAmount;
	export let displayUnit: DisplayUnit = 'token';
	export let exchangeRate: number | undefined;
	export let decimals: number;
	export let name = 'swap-amount';
	export let disabled = false;
	export let placeholder = '0';
	export let error = false;
	export let loading = false;

	$: isUSDDisplayUnit = displayUnit === 'usd';

	let displayValue: OptionAmount;
	let previousDisplayValue: OptionAmount;

	const handleInput = () => {
		if (displayValue === previousDisplayValue) {
			return;
		}

		previousDisplayValue = displayValue;

		if (isNullish(displayValue)) {
			value = undefined;
			return;
		}

		value = (
			isUSDDisplayUnit && nonNullish(exchangeRate)
				? Number(displayValue) / exchangeRate
				: Number(displayValue)
		).toFixed(decimals);
	};

	const changeDirection = () => {
		if (isNullish(exchangeRate) || isNullish(value)) {
			return;
		}
		displayValue = isUSDDisplayUnit ? (Number(value) * exchangeRate).toFixed(2) : Number(value);
		previousDisplayValue = displayValue;
	};

	const updateDisplay = () => {
		if (isNullish(value)) {
			value = undefined;
			displayValue = undefined;
			previousDisplayValue = displayValue;
			return;
		}

		if (nonNullish(exchangeRate) && isUSDDisplayUnit) {
			const newDisplayValue = (Number(value) * exchangeRate).toFixed(2);

			if (Number(newDisplayValue) !== Number(displayValue)) {
				displayValue = newDisplayValue;
			}
		} else {
			displayValue = Number(value);
		}
		previousDisplayValue = displayValue;
	};

	$: displayUnit, changeDirection();
	$: value, updateDisplay();
</script>

<div
	class="swap-input-currency flex h-full w-full items-center font-bold"
	class:padding={!isUSDDisplayUnit}
	class:text-error={error}
	class:animate-pulse={loading}
	data-testid="swap-input-currency"
>
	{#if isUSDDisplayUnit}
		<span
			class="pl-3 transition-colors"
			class:text-placeholder={isNullish(displayValue)}
			data-tid={SWAP_INPUT_CURRENCY_USD_SYMBOL}
		>
			$
		</span>
	{/if}
	<InputCurrency
		bind:value={displayValue}
		on:nnsInput={handleInput}
		{name}
		{placeholder}
		{disabled}
		decimals={isUSDDisplayUnit ? 2 : decimals}
		on:focus
		on:blur
		testId={SWAP_INPUT_CURRENCY}
	>
		<slot name="inner-end" slot="inner-end" />
	</InputCurrency>
</div>

<style lang="scss">
	:global(.swap-input-currency div.input-block) {
		display: block;
		height: 100%;
		justify-content: center;
		--padding: 0;
		--input-width: 100%;
	}

	:global(.swap-input-currency div.input-field input[id]) {
		height: 100%;
		border: none;
		border-radius: 0;
		padding: 0;
	}

	:global(.swap-input-currency.padding div.input-field input[id]) {
		padding: 0 0 0 0.75rem;
	}

	.transition-colors {
		transition: color var(--animation-time-short);
	}
</style>
