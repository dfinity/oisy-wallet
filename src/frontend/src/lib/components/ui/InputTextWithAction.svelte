<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { onMount, type Snippet } from 'svelte';
	import InputBase from '$lib/components/ui/InputBase.svelte';

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

<InputBase
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
