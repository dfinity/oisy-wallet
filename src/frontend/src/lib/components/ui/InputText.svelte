<script lang="ts">
	import Input from '$lib/components/ui/Input.svelte';

	interface Props {
		value: string;
		name: string;
		placeholder: string;
		showResetButton?: boolean;
		required?: boolean;
		testId?: string;
		autofocus?: boolean;
		disabled?: boolean;
	}

	let {
		value = $bindable(''),
		name,
		placeholder,
		showResetButton = false,
		required = true,
		testId,
		autofocus = false,
		disabled
	}: Props = $props();
</script>

<Input
	{name}
	inputType="text"
	{required}
	bind:value
	{placeholder}
	{showResetButton}
	spellcheck={false}
	autocomplete="off"
	{autofocus}
	{testId}
	{disabled}
/>
