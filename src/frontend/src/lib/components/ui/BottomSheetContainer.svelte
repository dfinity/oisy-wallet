<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { cubicIn, cubicOut } from 'svelte/easing';
	import { overlayFocus } from '$lib/utils/overlay.utils';
	import { slide } from '$lib/utils/transitions.utils';

	interface Props {
		transition?: boolean;
		onClose?: () => void;
		ariaLabel?: string;
		header?: Snippet;
		footer?: Snippet;
		children: Snippet;
	}

	let { transition = false, onClose, ariaLabel, header, footer, children }: Props = $props();

	let transitionFn = $derived(transition ? slide : () => ({}));

	const manageFocus = (node: HTMLElement) =>
		onClose ? overlayFocus(node, { onClose }) : undefined;
</script>

<div
	class="bottom-sheet"
	data-tid="bottom-sheet"
	role="dialog"
	aria-modal={onClose ? true : undefined}
	aria-label={ariaLabel}
	tabindex="-1"
	use:manageFocus
	in:transitionFn|global={{ axis: 'y', duration: 250, easing: cubicOut }}
	out:transitionFn|global={{ axis: 'y', duration: 200, easing: cubicIn }}
>
	{#if nonNullish(header)}
		<span>
			{@render header()}
		</span>
	{/if}

	<span>
		{@render children()}
	</span>

	{#if nonNullish(footer)}
		<span>
			{@render footer()}
		</span>
	{/if}
</div>

<style lang="scss">
	@use '$lib/styles/mixins/media';

	.bottom-sheet {
		span {
			display: flex;

			&:nth-child(2) {
				overflow-y: auto;
				overscroll-behavior: contain;
				flex-direction: inherit;
				padding-top: 0;
			}

			&:last-of-type {
				border-top: 1px solid var(--bottom-sheet-border-color);
			}
		}

		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;

		display: flex;
		flex-direction: column;

		max-height: 90vh;
		max-height: 90dvh;
		overflow-y: auto;
		overscroll-behavior: contain;

		background: var(--card-background);
		box-shadow: var(--bottom-sheet-box-shadow);

		z-index: var(--bottom-sheet-z-index);

		padding-bottom: env(safe-area-inset-bottom);

		border-top-left-radius: var(--border-radius-2x);
		border-top-right-radius: var(--border-radius-2x);

		@include media.min-width(large) {
			position: relative;

			background: transparent;
			box-shadow: none;

			z-index: auto;

			padding-bottom: 0;

			border-top-left-radius: 0;
			border-top-right-radius: 0;
		}
	}
</style>
