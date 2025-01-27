<script lang="ts">
	import InputCurrency from '$lib/components/ui/InputCurrency.svelte';
	import type { OptionAmount } from '$lib/types/send';
	import type { SwapDisplayMode } from '$lib/types/swap';
	import { isNullish, nonNullish } from '@dfinity/utils';

	export let value: OptionAmount;
	export let displayMode: SwapDisplayMode = 'usd';
	export let exchangeRate: number | undefined;
	export let decimals: number;
	export let name = 'swap-amount';
	export let disabled = false;
	export let placeholder = '0';
	export let error = false;
	export let loading = false;

	let displayValue: OptionAmount;
	let previousDisplayValue: OptionAmount;

	function formatNumber(num: number, decimalsCount: number): string {
		return num.toFixed(decimalsCount);
	}

	function handleInput() {
		if (displayValue === previousDisplayValue) {
			return;
		}
		previousDisplayValue = displayValue;

		if (isNullish(displayValue)) {
			value = undefined;
			return;
		}

		if (nonNullish(exchangeRate)) {
			if (displayMode === 'token') {
				value = formatNumber(Number(displayValue) / exchangeRate, decimals);
			} else {
				value = formatNumber(Number(displayValue), decimals);
			}
		} else {
			value = displayValue;
		}
	}

	const changeDirection = () => {
		if (isNullish(exchangeRate) || isNullish(value)) {
			return;
		}

		if (displayMode === 'token') {
			displayValue = formatNumber(Number(value) * exchangeRate, 2);
			previousDisplayValue = displayValue;
		} else {
			displayValue = Number(value);
			previousDisplayValue = displayValue;
		}
	};

	$: displayMode, changeDirection();

	const updateDisplay = () => {
		if (isNullish(value)) {
			value = undefined;
			displayValue = undefined;
			previousDisplayValue = displayValue;
			return;
		}

		if (nonNullish(value) && nonNullish(exchangeRate) && displayMode === 'token') {
			const newDisplayValue = formatNumber(Number(value) * exchangeRate, 2);
			if (Number(newDisplayValue) !== Number(displayValue)) {
				displayValue = newDisplayValue;
				previousDisplayValue = displayValue;
			}
		} else if (nonNullish(value)) {
			displayValue = Number(value);
			previousDisplayValue = displayValue;
		}
	}

	$: value, updateDisplay();
</script>

<div
	class="swap-input-currency h-full w-full font-bold flex items-center"
	class:padding={displayMode === 'usd'}
	class:text-error={error}
	class:animate-pulse={loading}
>
	{#if displayMode === 'token'}
		<span class="pl-3 transition-colors" class:text-placeholder={isNullish(displayValue)}>
			$
		</span>
	{/if}
	<InputCurrency
		bind:value={displayValue}
		on:nnsInput={handleInput}
		{name}
		{placeholder}
		{disabled}
		decimals={displayMode === 'token' ? 2 : decimals}
		on:focus
		on:blur
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
