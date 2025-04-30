<script lang="ts">
	import Input from '$lib/components/ui/Input.svelte';

	export let value = '';
	export let name: string;
	export let placeholder: string;
	export let required = true;
	export let testId: string | undefined = undefined;
	export let autofocus = false;
	export let showResetButton = false;
	export let resetButtonAriaLabel: string | undefined = undefined;
	export let inputElement: HTMLInputElement | undefined = undefined;
</script>

<Input
	{name}
	inputType="text"
	{required}
	bind:value
	{placeholder}
	{showResetButton}
	{resetButtonAriaLabel}
	{autofocus}
	spellcheck={false}
	autocomplete="off"
	{testId}
	on:nnsInput
	bind:inputElement
>
	<slot name="inner-end" slot="inner-end" />
</Input>
