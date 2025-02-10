<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import TokenInputCurrency from '$lib/components/tokens/TokenInputCurrency.svelte';
	import {
		TOKEN_INPUT_CURRENCY_USD,
		TOKEN_INPUT_CURRENCY_USD_SYMBOL
	} from '$lib/constants/test-ids.constants';
	import type { OptionAmount } from '$lib/types/send';

	export let tokenAmount: OptionAmount;
	export let tokenDecimals: number;
	export let exchangeRate: number | undefined = undefined;
	export let name = 'token-input-currency-usd';
	export let disabled = false;
	export let placeholder = '0';
	export let error = false;
	export let loading = false;

	let displayValue: OptionAmount;

	const handleInput = () =>
		(tokenAmount =
			nonNullish(exchangeRate) && nonNullish(displayValue)
				? (Number(displayValue) / exchangeRate).toFixed(tokenDecimals)
				: undefined);

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
	decimals={2}
	on:focus
	on:blur
	testId={TOKEN_INPUT_CURRENCY_USD}
	styleClass="no-padding"
>
	<svelte:fragment slot="prefix">
		<span
			class="duration=[var(--animation-time-short)] pl-3 transition-colors"
			class:text-tertiary={isNullish(displayValue)}
			data-tid={TOKEN_INPUT_CURRENCY_USD_SYMBOL}
		>
			$
		</span>
	</svelte:fragment>
	<slot name="inner-end" slot="inner-end" />
</TokenInputCurrency>

<style lang="scss">
	:global(.token-input-currency.no-padding div.input-field input[id]) {
		padding: 0;
	}
</style>
