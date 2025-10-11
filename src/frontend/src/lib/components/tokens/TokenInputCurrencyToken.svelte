<!-- @migration-task Error while migrating Svelte code: This migration would change the name of a slot (inner-end to inner_end) making the component unusable -->
<!-- @migration-task Error while migrating Svelte code: This migration would change the name of a slot (inner-end to inner_end) making the component unusable -->
<!-- @migration-task Error while migrating Svelte code: This migration would change the name of a slot (inner-end to inner_end) making the component unusable -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import TokenInputCurrency from '$lib/components/tokens/TokenInputCurrency.svelte';
	import { TOKEN_INPUT_CURRENCY_TOKEN } from '$lib/constants/test-ids.constants';
	import type { OptionAmount } from '$lib/types/send';

	interface Props {
		innerEnd?: Snippet;
		value: OptionAmount;
		decimals: number;
		name?: string;
		disabled?: boolean;
		placeholder?: string;
		error?: boolean;
		loading?: boolean;
		autofocus?: boolean;
		onInput: () => void;
	}

	let {
		innerEnd,
		value = $bindable(),
		decimals,
		name = 'token-input-currency-token',
		disabled = false,
		placeholder = '0',
		error = false,
		loading = false,
		autofocus = false,
		onInput
	}: Props = $props();
</script>

<TokenInputCurrency
	{name}
	{autofocus}
	{decimals}
	{disabled}
	{error}
	{innerEnd}
	{loading}
	{onInput}
	{placeholder}
	testId={TOKEN_INPUT_CURRENCY_TOKEN}
	bind:value
	on:focus
	on:blur
/>
