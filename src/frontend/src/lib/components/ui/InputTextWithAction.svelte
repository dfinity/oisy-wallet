<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { onMount, type Snippet } from 'svelte';

	interface Props {
		innerEnd?: Snippet;
		value?: string;
		name: string;
		placeholder: string;
		required?: boolean;
		testId?: string;
		autofocus?: boolean;
		inputElement?: HTMLInputElement;
		onBlur?: () => void;
		onFocus?: () => void;
	}

	let {
		innerEnd,
		value = $bindable(''),
		name,
		placeholder,
		required = true,
		testId,
		autofocus = false,
		inputElement = $bindable(),
		onBlur,
		onFocus
	}: Props = $props();

	onMount(() => {
		if (autofocus && nonNullish(inputElement)) {
			inputElement.focus();
		}
	});
</script>

<Input
	{name}
	autocomplete="off"
	{innerEnd}
	inputType="text"
	{onBlur}
	{onFocus}
	{placeholder}
	{required}
	spellcheck={false}
	{testId}
	bind:value
	bind:inputElement
/>
