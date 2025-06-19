<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { onMount, type Snippet } from 'svelte';
	import Input from '$lib/components/ui/Input.svelte';

	interface Props {
		innerEnd?: Snippet;
		value?: string;
		name: string;
		placeholder: string;
		required?: boolean;
		testId?: string;
		autofocus?: boolean;
		inputElement?: HTMLInputElement;
		showResetButton?: boolean;
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
		showResetButton = false
	}: Props = $props();

	onMount(() => {
		if (autofocus && nonNullish(inputElement)) {
			inputElement.focus();
		}
	});
</script>

<Input
	{name}
	inputType="text"
	{required}
	bind:value
	{placeholder}
	spellcheck={false}
	autocomplete="off"
	{testId}
	on:nnsInput
	on:blur
	on:focus
	bind:inputElement
	{showResetButton}
>
	{#snippet innerEnd()}
		<div class="pl-2">
			{@render innerEnd?.()}
		</div>
	{/snippet}
</Input>
