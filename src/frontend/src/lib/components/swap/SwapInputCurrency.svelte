<script lang="ts">
	import InputCurrency from '$lib/components/ui/InputCurrency.svelte';
	import type { OptionAmount } from '$lib/types/send';
	export let value: OptionAmount;
	export let decimals: number;
	export let name = 'swap-amount';
	export let disabled = false;
	export let placeholder = '0';
	export let error = false;
</script>

<div class="swap-input-currency h-full w-full font-bold" class:text-error={error}>
	<InputCurrency bind:value {name} {placeholder} {disabled} {decimals} on:focus on:blur>
		<slot name="inner-end" slot="inner-end" />
	</InputCurrency>
</div>

<style lang="postcss">
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
