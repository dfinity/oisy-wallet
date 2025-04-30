<script lang="ts">
	import Input from '$lib/components/ui/Input.svelte';

	export let value = '';
	export let name: string;
	export let placeholder: string;
	export let showResetButton = false;
	export let resetButtonAriaLabel: string | undefined = undefined;
	export let autofocus = false;
	export let required = true;
</script>

<Input
	{name}
	inputType="text"
	{required}
	{showResetButton}
	{resetButtonAriaLabel}
	{autofocus}
	bind:value
	{placeholder}
	spellcheck={false}
	autocomplete="off"
/>
