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
		onBlur: () => void;
		onFocus: () => void;
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
		onInput,
		onBlur,
		onFocus
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
	{onBlur}
	{onFocus}
	{onInput}
	{placeholder}
	testId={TOKEN_INPUT_CURRENCY_TOKEN}
	bind:value
/>
