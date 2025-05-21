<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';

	interface Props {
		value?: string | number;
		disabled?: boolean;
		name: string;
		placeholder: string;
		required?: boolean;
		decimals?: number;
		testId?: string;
		autofocus?: boolean;
	}

	let {
		value = $bindable(),
		disabled,
		name,
		placeholder,
		required = true,
		decimals,
		testId,
		autofocus = false
	}: Props = $props();

	let inputElement = $state<HTMLInputElement | undefined>();

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
