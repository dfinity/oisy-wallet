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
	}

	let {
		innerEnd,
		value = $bindable(''),
		name,
		placeholder,
		required = true,
		testId,
		autofocus = false,
		inputElement = $bindable()
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
	inputType="text"
	{placeholder}
	{required}
	spellcheck={false}
	{testId}
	bind:value
	on:nnsInput
	on:blur
	on:focus
	bind:inputElement
>
	<svelte:fragment slot="inner-end">{@render innerEnd?.()}</svelte:fragment>
</Input>
