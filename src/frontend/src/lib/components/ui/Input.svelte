<script lang="ts">
	import { Input as GixInput, IconClose } from '@dfinity/gix-components';
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import type { ComponentProps, Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	type GixInputProps = ComponentProps<GixInput>;
	type InputProps = {
		showResetButton?: boolean;
		resetButtonAriaLabel?: string;
		showPasteButton?: boolean;
		innerEnd?: Snippet;
	};

	let endWidth: number = $state(0);

	let {
		showResetButton,
		resetButtonAriaLabel,
		showPasteButton,
		value = $bindable(),
		innerEnd,
		...props
	}: InputProps & GixInputProps = $props();

	const handleReset = () => {
		value = undefined;
	};

	const handlePaste = () => {
		try {
			navigator.clipboard.readText().then((text) => {
				value = text;
			});
		} catch (e) {
			console.error('Failed to paste clipboard', e);
		}
	};
</script>

{#snippet resetButton()}
	<div transition:fade>
		<ButtonIcon
			styleClass="border-0 px-0 py-2 text-tertiary"
			on:click={handleReset}
			ariaLabel={resetButtonAriaLabel ?? $i18n.convert.text.input_reset_button}
		>
			<IconClose slot="icon" size="24" />
		</ButtonIcon>
	</div>
	{#if nonNullish(innerEnd) || showPasteButton}
		<div class="border-r-1 border-black/20" transition:fade></div>
	{/if}
{/snippet}

{#snippet pasteButton()}
	<Button
		type="button"
		styleClass="text-sm px-1 py-2 mx-1"
		colorStyle="tertiary-alt"
		ariaLabel={$i18n.core.text.paste}
		on:click={handlePaste}>{$i18n.core.text.paste}</Button
	>
{/snippet}

<div style={`--input-padding-inner-end: calc(var(--padding-2x) + ${endWidth}px)`}>
	<GixInput {...props} bind:value on:nnsInput>
		<svelte:fragment slot="inner-end">
			<div bind:clientWidth={endWidth} class="flex pl-2">
				{#if nonNullish(value) && notEmptyString(value.toString()) && showResetButton}
					{@render resetButton()}
				{/if}
				{#if showPasteButton}
					{@render pasteButton()}
				{/if}
				{@render innerEnd?.()}
			</div>
		</svelte:fragment>
	</GixInput>
</div>
