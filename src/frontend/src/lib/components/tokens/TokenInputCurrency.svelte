<script lang="ts">
	import InputCurrency from '$lib/components/ui/InputCurrency.svelte';
	import type { OptionAmount } from '$lib/types/send';

	export let value: OptionAmount;
	export let decimals: number;
	export let name = 'token-input-currency';
	export let disabled = false;
	export let placeholder = '0';
	export let error = false;
	export let loading = false;
	export let testId: string | undefined = undefined;
	export let styleClass = '';
</script>

<div
	class={`token-input-currency flex h-full w-full items-center font-bold ${styleClass}`}
	class:text-error-primary={error}
	class:animate-pulse={loading}
>
	<slot name="prefix"></slot>
	<InputCurrency
		{testId}
		bind:value
		{name}
		{placeholder}
		{disabled}
		{decimals}
		on:focus
		on:blur
		on:nnsInput
	>
		<slot name="inner-end" slot="inner-end" />
	</InputCurrency>
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
		padding: 0 0 0 0.75rem;
	}
</style>
