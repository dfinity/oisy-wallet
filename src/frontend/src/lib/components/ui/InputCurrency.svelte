<script lang="ts">
	import { Input } from '@dfinity/gix-components';

	export let value: number | undefined = undefined;
	export let disabled: boolean | undefined = undefined;
	export let name: string;
	export let placeholder: string;
	export let required = true;
	export let decimals: number | undefined = undefined;
	export let testId: string | undefined = undefined;
</script>

<Input
	{name}
	inputType="currency"
	{required}
	bind:value
	{decimals}
	{placeholder}
	spellcheck={false}
	autocomplete="off"
	{testId}
	{disabled}
	on:nnsInput
>
	<slot name="inner-end" slot="inner-end" />
</Input>
