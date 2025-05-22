<script lang="ts">
	import Input from '$lib/components/ui/Input.svelte';

	export let value = '';
	export let name: string;
	export let placeholder: string;
	export let showResetButton = false;
	export let required = true;
	export let testId: string | undefined = undefined;
	export let autofocus = false;
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
/>
