<!-- @migration-task Error while migrating Svelte code: This migration would change the name of a slot (inner-end to inner_end) making the component unusable -->
<!-- @migration-task Error while migrating Svelte code: This migration would change the name of a slot (inner-end to inner_end) making the component unusable -->
<!-- @migration-task Error while migrating Svelte code: This migration would change the name of a slot (inner-end to inner_end) making the component unusable -->
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
	export let autofocus = false;
</script>

<TokenInputCurrency
	{name}
	{autofocus}
	{decimals}
	{disabled}
	{error}
	{loading}
	{placeholder}
	testId={TOKEN_INPUT_CURRENCY_TOKEN}
	bind:value
	on:focus
	on:blur
	on:nnsInput
>
	{#snippet innerEnd()}
		<slot name="inner-end" />
	{/snippet}
</TokenInputCurrency>
