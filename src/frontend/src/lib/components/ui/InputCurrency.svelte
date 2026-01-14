<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { onMount, type Snippet } from 'svelte';

	interface Props {
		innerEnd?: Snippet;
		value?: string | number;
		disabled?: boolean;
		name: string;
		placeholder: string;
		required?: boolean;
		decimals?: number;
		testId?: string;
		autofocus?: boolean;
		onInput: () => void;
		onBlur: () => void;
		onFocus: () => void;
	}

	let {
		innerEnd,
		value = $bindable(),
		disabled,
		name,
		placeholder,
		required = true,
		decimals,
		testId,
		autofocus = false,
		onInput,
		onBlur,
		onFocus
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
		autocomplete="off"
		{decimals}
		{disabled}
		{innerEnd}
		inputType="currency"
		{onBlur}
		{onFocus}
		{onInput}
		{placeholder}
		{required}
		spellcheck={false}
		{testId}
		bind:value
		bind:inputElement
	/>
</div>
