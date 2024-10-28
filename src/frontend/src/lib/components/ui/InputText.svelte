<script lang="ts">
	import { Input } from '@dfinity/gix-components';

	export let value = '';
	export let name: string;
	export let placeholder: string;
	export let required = true;
</script>

<Input
	{name}
	inputType="text"
	{required}
	bind:value
	{placeholder}
	spellcheck={false}
	autocomplete="off"
	on:nnsInput
>
	<slot name="inner-end" slot="inner-end" />
</Input>
