<script lang="ts">
	import { Input as GixInput, IconClose } from '@dfinity/gix-components';
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import { type ComponentProps } from 'svelte';
	import { i18n } from '$lib/stores/i18n.store';

	type GixInputProps = ComponentProps<GixInput>;
	type InputProps = {
		showResetButton?: boolean;
		resetButtonAriaLabel?: string;
	};

	let {
		showResetButton,
		resetButtonAriaLabel,
		value = $bindable(),
		...props
	}: InputProps & GixInputProps = $props();

	const reset = () => {
		value = undefined;
	};
</script>

<GixInput {...props} bind:value>
	<svelte:fragment slot="inner-end">
		{#if nonNullish(value) && notEmptyString(value.toString()) && showResetButton}
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
