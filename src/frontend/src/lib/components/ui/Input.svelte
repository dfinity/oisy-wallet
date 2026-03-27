<script lang="ts">
	import { Input as GixInput, type InputProps as GixInputProps } from '@dfinity/gix-components';
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import ButtonPaste from '$lib/components/ui/ButtonPaste.svelte';
	import ButtonReset from '$lib/components/ui/ButtonReset.svelte';

	export interface InputProps extends GixInputProps {
		showResetButton?: boolean;
		resetButtonAriaLabel?: string;
		showPasteButton?: boolean;
		innerEnd?: Snippet;
	}

	let endWidth: number = $state(0);

	let {
		showResetButton,
		resetButtonAriaLabel,
		showPasteButton,
		value = $bindable(),
		innerEnd: innerEndProp,
		...props
	}: InputProps = $props();
</script>

<div
	style={`--input-padding-inner-end: calc(var(--padding-2x) + ${endWidth}px)`}
	class="base-input"
>
	<GixInput {...props} bind:value>
		{#snippet innerEnd()}
			<div class="flex items-center pl-2" bind:clientWidth={endWidth}>
				{#if nonNullish(value) && notEmptyString(value.toString()) && showResetButton}
					<div transition:fade>
						<ButtonReset ariaLabel={resetButtonAriaLabel} onclick={() => (value = undefined)} />
					</div>
					{#if nonNullish(innerEndProp) || showPasteButton}
						<div class="self-stretch border-r-1 border-black/20" transition:fade></div>
					{/if}
				{/if}
				{#if showPasteButton}
					<ButtonPaste onpaste={(text) => (value = text)} />
				{/if}
				{@render innerEndProp?.()}
			</div>
		{/snippet}
	</GixInput>
</div>

<style lang="scss">
	:global(div.base-input input) {
		font-size: var(--input-font-size);
	}
</style>
