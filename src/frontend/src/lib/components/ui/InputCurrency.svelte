<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';

	export let value: string | number | undefined = undefined;
	export let disabled: boolean | undefined = undefined;
	export let name: string;
	export let placeholder: string;
	export let required = true;
	export let decimals: number | undefined = undefined;
	export let testId: string | undefined = undefined;
	export let autofocus = false;

	let inputElement: HTMLInputElement | undefined;

	onMount(() => {
		if (autofocus && nonNullish(inputElement)) {
			inputElement.focus();
		}
	});
</script>

<div class="input-currency-container">
	<Input
		{name}
		inputType="currency"
		{required}
		bind:value
		{decimals}
		{placeholder}
		spellcheck={false}
		autocomplete="off"
		{testId}
		{disabled}
		on:nnsInput
		on:blur
		on:focus
		bind:inputElement
	>
		<slot name="inner-end" slot="inner-end" />
	</Input>
</div>
