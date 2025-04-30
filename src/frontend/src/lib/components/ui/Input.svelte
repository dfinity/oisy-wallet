<script lang="ts">
	import { Input as GixInput, IconClose } from '@dfinity/gix-components';
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import { onMount, type ComponentProps } from 'svelte';
	import { i18n } from '$lib/stores/i18n.store';

	type GixInputProps = ComponentProps<GixInput>;
	type InputProps = {
		showResetButton?: boolean;
		resetButtonAriaLabel?: string;
		autofocus?: boolean;
	};

	onMount(() => {
		if (autofocus && nonNullish(inputElement)) {
			inputElement.focus();
		}
	});

	let {
		showResetButton,
		resetButtonAriaLabel,
		autofocus = false,
		value = $bindable(),
		inputElement = $bindable(),
		...props
	}: InputProps & GixInputProps = $props();

	const reset = () => {
		value = undefined;
	};
</script>

<GixInput {...props} bind:value bind:inputElement on:nnsInput>
	<svelte:fragment slot="inner-end">
		{#if (typeof value === 'string' ? notEmptyString(value) : nonNullish(value)) && showResetButton}
			<button
				class="text-tertiary"
				on:click={reset}
				aria-label={resetButtonAriaLabel ?? $i18n.convert.text.input_reset_button}
			>
				<IconClose />
			</button>
		{/if}
		{#if $$slots['inner-end']}
			<slot name="inner-end" />
		{/if}
	</svelte:fragment>
</GixInput>
