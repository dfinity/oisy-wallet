<script lang="ts">
	import { Input as GixInput, IconClose } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { onMount, type ComponentProps } from 'svelte';
	import { i18n } from '$lib/stores/i18n.store';

	type GixInputProps = ComponentProps<GixInput>;
	type InputProps = {
		autofocus?: boolean;
		showResetButton?: boolean;
		resetButtonAriaLabel?: string;
	};

	let inputElement: HTMLInputElement | undefined = undefined;

	onMount(() => {
		if (autofocus && nonNullish(inputElement)) {
			inputElement.focus();
		}
	});

	let {
		autofocus,
		showResetButton,
		resetButtonAriaLabel,
		value = $bindable(),
		...props
	}: InputProps & GixInputProps = $props();

	const reset = () => {
		value = undefined;
	};
</script>

<GixInput {...props} bind:inputElement bind:value>
	<svelte:fragment slot="inner-end">
		{#if value && showResetButton}
			<button
				class="text-tertiary"
				on:click={reset}
				aria-label={resetButtonAriaLabel ?? $i18n.convert.text.input_reset_button}
			>
				<IconClose />
			</button>
		{/if}
	</svelte:fragment>
</GixInput>
