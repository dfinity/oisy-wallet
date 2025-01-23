<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import InputCurrency from '$lib/components/ui/InputCurrency.svelte';
	import type { OptionAmount } from '$lib/types/send';
	import type { SwapDisplayMode } from '$lib/types/swap';
	import { formatUSD } from '$lib/utils/format.utils';

	export let value: OptionAmount;
	export let displayMode: SwapDisplayMode = 'usd';
	export let exchangeRate: number | undefined = undefined;
	export let decimals: number;
	export let name = 'swap-amount';
	export let disabled = false;
	export let placeholder = '0';
	export let error = false;
	export let loading = false;

	let displayValue: OptionAmount;

	function formatNumber({ num, decimalsCount }: { num: number; decimalsCount: number }): string {
		return num.toFixed(decimalsCount);
	}

	// Handle user input changes
	function handleInput() {
		if (isNullish(displayValue)) {
			value = 0;
			return;
		}

		if (nonNullish(exchangeRate)) {
			if (displayMode === 'token') {
				value = formatNumber({ num: Number(displayValue) / exchangeRate, decimalsCount: decimals });
			} else {
				value = formatNumber({ num: Number(displayValue), decimalsCount: decimals });
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
			displayValue = formatUSD({
				value: Number(value) * exchangeRate,
				options: { minFraction: 0 }
			});
		} else {
			displayValue = Number(value);
		}
	};

	$: displayMode, changeDirection();
</script>

<div
	class="swap-input-currency h-full w-full font-bold"
	class:text-error={error}
	class:animate-pulse={loading}
>
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
		padding: 0 0 0 0.75rem;
	}
</style>
