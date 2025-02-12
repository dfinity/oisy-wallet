<script lang="ts">
	import TokenInputCurrency from '$lib/components/tokens/TokenInputCurrency.svelte';
	import { TOKEN_INPUT_CURRENCY_TOKEN } from '$lib/constants/test-ids.constants';
	import type { OptionAmount } from '$lib/types/send';

	export let value: OptionAmount;
	export let decimals: number;
	export let name = 'token-input-currency-token';
	export let disabled = false;
	export let placeholder = '0';
	export let error = false;
	export let loading = false;
</script>

<TokenInputCurrency
	bind:value
	{name}
	{error}
	{loading}
	{placeholder}
	{disabled}
	{decimals}
	on:focus
	on:blur
	testId={TOKEN_INPUT_CURRENCY_TOKEN}
	on:nnsInput
>
	<slot name="inner-end" slot="inner-end" />
</TokenInputCurrency>
