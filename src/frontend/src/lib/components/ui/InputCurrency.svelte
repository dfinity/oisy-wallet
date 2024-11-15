<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';

	export let value: number | undefined = undefined;
	export let disabled: boolean | undefined = undefined;
	export let name: string;
	export let placeholder: string;
	export let required = true;
	export let decimals: number | undefined = undefined;
	export let testId: string | undefined = undefined;

	const dispatch = createEventDispatcher();

	let inputValue: string | undefined;
	// Convert value to string if it comes from parent (e.g. initial state or set-to-max button)
	$: inputValue = nonNullish(value) ? `${value}` : undefined;

	const onInput = () => {
		// Convert inputValue to number before updating parent's value
		value = nonNullish(inputValue) ? Number(inputValue) : undefined;

		// Bubble nnsInput as consumers might require the event as well
		dispatch('nnsInput');
	};
</script>

<Input
	{name}
	inputType="currency"
	{required}
	bind:value={inputValue}
	{decimals}
	{placeholder}
	spellcheck={false}
	autocomplete="off"
	{testId}
	{disabled}
	on:nnsInput={onInput}
>
	<slot name="inner-end" slot="inner-end" />
</Input>
