<!-- Ported from @dfinity/gix-components Dropdown (a styled native <select>). -->
<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import IconExpandMore from '$lib/components/icons/IconExpandMore.svelte';

	interface Props {
		// Do not allow to use objects as values.
		// Ex: in the query/update calls we do, when the object changes, the value is pointing to the old object.
		selectedValue?: string;
		name: string;
		testId?: string;
		disabled?: boolean;
		start?: Snippet;
		children?: Snippet;
	}

	let {
		selectedValue = $bindable(),
		name,
		testId,
		disabled = false,
		start,
		children
	}: Props = $props();

	let showStart = $derived(nonNullish(start));
</script>

<div class="select" data-tid="select-component">
	{#if showStart}
		<div class="start">
			{@render start?.()}
		</div>
	{/if}
	<select {name} class:offset={showStart} data-tid={testId} {disabled} bind:value={selectedValue}>
		{@render children?.()}
	</select>
	<span class="icon">
		<IconExpandMore />
	</span>
</div>

<style lang="scss">
	@use '$lib/styles/mixins/form';
	@use '$lib/styles/mixins/text';

	.select {
		position: relative;
		box-sizing: border-box;

		display: flex;
		align-items: center;
		justify-content: space-between;

		border-radius: var(--border-radius);

		width: var(--dropdown-width, auto);

		overflow: hidden;

		@include form.input;

		// Click on <select> does not trigger "focus" on parent div.
		// https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-within
		// Matches an element if the element or any of its descendants are focused.
		&:focus-within {
			@include form.input-focus;
		}

		select {
			width: 100%;
			background: var(--input-background);
			border: none;

			--select-padding-inner-top-bottom: var(--select-padding-top-bottom, var(--padding-2x));
			padding: var(--select-padding-inner-top-bottom) calc(5 * var(--padding))
				var(--select-padding-inner-top-bottom) var(--select-padding-inner-start, var(--padding-2x));

			appearance: none;

			font-size: inherit;
			font-weight: inherit;

			@include text.truncate;

			&.offset {
				--select-padding-inner-start: var(--select-padding-start, calc(5 * var(--padding)));
			}

			&:focus {
				outline: none;
			}
		}

		// Folded in from the former gix.scss `div.select` override layer (OISY-owned): the option colors
		// need `:global` because the <option> elements are provided by the consumer (slotted content).
		:global(option) {
			background: var(--color-background-primary);
			color: var(--color-foreground-primary);
		}

		.icon {
			display: flex;
			height: 100%;
			align-items: center;

			pointer-events: none;

			margin-right: var(--padding-1_5x);

			color: var(--disable-contrast);

			// Folded in from the former gix.scss `div.select .icon` override layer (OISY-owned).
			--disable-contrast: var(--color-foreground-primary);

			position: absolute;
			right: 0;

			// Size to match the line-height when font-size is 16px
			:global(svg) {
				width: 20px;
				height: 20px;
			}
		}
	}

	.start {
		position: absolute;
		left: 0;

		pointer-events: none;
	}
</style>
