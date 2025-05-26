<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';

	export let value = '';
	export let name: string;
	export let placeholder: string;
	export let required = true;
	export let testId: string | undefined = undefined;
	export let autofocus = false;
	export let inputElement: HTMLInputElement | undefined = undefined;

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
>
	<slot name="inner-end" slot="inner-end" />
</Input>
