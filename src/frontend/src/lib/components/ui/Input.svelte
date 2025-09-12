<script lang="ts">
	import { Input as GixInput } from '@dfinity/gix-components';
	import { nonNullish, notEmptyString } from '@dfinity/utils';
	import type { Snippet, ComponentProps } from 'svelte';
	import { fade } from 'svelte/transition';
	import ButtonPaste from '$lib/components/ui/ButtonPaste.svelte';
	import ButtonReset from '$lib/components/ui/ButtonReset.svelte';

	type GixInputProps = ComponentProps<GixInput>;
	interface InputProps {
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
		innerEnd,
		...props
	}: InputProps & GixInputProps = $props();
</script>

<div
	style={`--input-padding-inner-end: calc(var(--padding-2x) + ${endWidth}px)`}
	class="base-input"
>
	<GixInput {...props} bind:value on:nnsInput>
		<!-- @migration-task: migrate this slot by hand, `inner-end` is an invalid identifier -->
		<!-- @migration-task: migrate this slot by hand, `inner-end` is an invalid identifier -->
		<!-- @migration-task: migrate this slot by hand, `inner-end` is an invalid identifier -->
		<svelte:fragment slot="inner-end">
			<div class="flex items-center pl-2" bind:clientWidth={endWidth}>
				{#if nonNullish(value) && notEmptyString(value.toString()) && showResetButton}
					<div transition:fade>
						<ButtonReset ariaLabel={resetButtonAriaLabel} onclick={() => (value = undefined)} />
					</div>
					{#if nonNullish(innerEnd) || showPasteButton}
						<div class="border-r-1 self-stretch border-black/20" transition:fade></div>
					{/if}
				{/if}
				{#if showPasteButton}
					<ButtonPaste onpaste={(text) => (value = text)} />
				{/if}
				{@render innerEnd?.()}
			</div>
		</svelte:fragment>
	</GixInput>
</div>

<style lang="scss">
	:global(div.base-input input) {
		font-size: var(--input-font-size);
	}
</style>
