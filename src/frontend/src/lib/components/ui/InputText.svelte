<script lang="ts">
	import type { Snippet } from 'svelte';
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
		innerEnd?: Snippet;
	}

	let {
		value = $bindable(''),
		name,
		placeholder,
		showResetButton = false,
		required = true,
		testId,
		autofocus = false,
		disabled,
		innerEnd
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
	{innerEnd}
/>
