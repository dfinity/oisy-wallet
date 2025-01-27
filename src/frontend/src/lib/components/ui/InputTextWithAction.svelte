<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import { onMount } from 'svelte';
	import { nonNullish } from '@dfinity/utils';

	export let value = '';
	export let name: string;
	export let placeholder: string;
	export let required = true;
	export let testId: string | undefined = undefined;
	export let autofocus = false;

	onMount(() => {
		if (autofocus) {
			let component = document.querySelector(`input[name="${name}"]`);
			if (nonNullish(component)) {
				component.focus();
			}
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
>
	<slot name="inner-end" slot="inner-end" />
</Input>
