<script lang="ts">
	import { Input } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { type Snippet, onMount, type Snippet } from 'svelte';

	interface Props {
		innerEnd: Snippet;
		value?: string | number;
		disabled?: boolean;
		name: string;
		placeholder: string;
		required?: boolean;
		decimals?: number;
		testId?: string;
		autofocus?: boolean;
	}

	let {
		innerEnd,
		value = $bindable(),
		disabled,
		name,
		placeholder,
		required = true,
		decimals,
		testId,
		autofocus = false
	}: Props = $props();

	let inputElement = $state<HTMLInputElement | undefined>();

	onMount(() => {
		if (autofocus && nonNullish(inputElement)) {
			inputElement.focus();
		}
	});
</script>

<div class="input-currency-container">
	<Input
		{name}
		autocomplete="off"
		{decimals}
		{disabled}
		inputType="currency"
		{placeholder}
		{required}
		spellcheck={false}
		{testId}
		bind:value
		on:nnsInput
		on:blur
		on:focus
		bind:inputElement
	>
		<!-- @migration-task: migrate this slot by hand, `inner-end` is an invalid identifier -->
		<!-- @migration-task: migrate this slot by hand, `inner-end` is an invalid identifier -->
		<!-- @migration-task: migrate this slot by hand, `inner-end` is an invalid identifier -->
		<svelte:fragment slot="inner-end">
			{@render innerEnd()}
		</svelte:fragment>
	</Input>
</div>
