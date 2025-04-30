<script lang="ts">
	import { Input } from '@dfinity/gix-components';

	export let value = '';
	export let name: string;
	export let placeholder: string;
	export let required = true;
	export let testId: string | undefined = undefined;
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
/>
