<script lang="ts">
	import SwapInputCurrency from '$lib/components/swap/SwapInputCurrency.svelte';
	import { SWAP_INPUT_CURRENCY_TOKEN } from '$lib/constants/test-ids.constants';
	import type { OptionAmount } from '$lib/types/send';

	export let value: OptionAmount;
	export let decimals: number;
	export let name = 'swap-amount-token';
	export let disabled = false;
	export let placeholder = '0';
	export let error = false;
	export let loading = false;
</script>

<SwapInputCurrency
	bind:value
	{name}
	{error}
	{loading}
	{placeholder}
	{disabled}
	{decimals}
	on:focus
	on:blur
	testId={SWAP_INPUT_CURRENCY_TOKEN}
>
	<slot name="inner-end" slot="inner-end" />
</SwapInputCurrency>
