<script lang="ts">
	import type { Snippet } from 'svelte';
	import InputCurrency from '$lib/components/ui/InputCurrency.svelte';
	import type { OptionAmount } from '$lib/types/send';

	interface Props {
		innerEnd: Snippet;
		prefix?: Snippet;
		value: OptionAmount;
		decimals: number;
		name?: string;
		disabled?: boolean;
		placeholder?: string;
		error?: boolean;
		loading?: boolean;
		testId?: string;
		styleClass?: string;
		autofocus?: boolean;
	}

	let {
		innerEnd,
		prefix,
		value = $bindable(),
		decimals,
		name = 'token-input-currency',
		disabled = false,
		placeholder = '0',
		error = false,
		loading = false,
		testId,
		styleClass = '',
		autofocus = false
	}: Props = $props();
</script>

<div
	class={`token-input-currency flex h-full w-full items-center font-bold ${styleClass}`}
	class:animate-pulse={loading}
	class:text-error-primary={error}
>
	{@render prefix?.()}
	<InputCurrency
		{name}
		{autofocus}
		{decimals}
		{disabled}
		{innerEnd}
		{placeholder}
		{testId}
		bind:value
		on:focus
		on:blur
		on:nnsInput
	/>
</div>

<style lang="scss">
	:global(.token-input-currency div.input-block) {
		display: block;
		height: 100%;
		justify-content: center;
		--padding: 0;
		--input-width: 100%;
	}

	:global(.token-input-currency div.input-field input[id]) {
		height: 100%;
		border: none;
		border-radius: 0;
		padding: 0 0.75rem 0 0.75rem;
	}
</style>
