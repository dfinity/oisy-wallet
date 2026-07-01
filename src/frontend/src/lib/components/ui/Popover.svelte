<!-- Ported from @dfinity/gix-components Popover; originally based on
	 https://github.com/papyrs/papyrs/blob/main/src/lib/components/ui/Popover.svelte -->
<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { quintOut } from 'svelte/easing';
	import { fade, scale } from 'svelte/transition';
	import IconClose from '$lib/components/icons/IconClose.svelte';
	import Backdrop from '$lib/components/ui/Backdrop.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { PopoverDirection } from '$lib/types/popover';
	import { stopPropagation } from '$lib/utils/event-modifiers.utils';
	import { computePopoverPlacement } from '$lib/utils/popover.utils';

	interface Props {
		anchor?: HTMLElement;
		visible?: boolean;
		direction?: PopoverDirection;
		closeButton?: boolean;
		invisibleBackdrop?: boolean;
		testId?: string;
		children?: Snippet;
	}

	let {
		anchor,
		visible = $bindable(false),
		direction = 'ltr',
		closeButton = false,
		invisibleBackdrop = false,
		testId = 'popover-component',
		children
	}: Props = $props();

	// Fallback used when `--padding` cannot be read (e.g. before the CSS
	// variables are applied). Matches the default declared in
	// `src/lib/styles/global/variables.scss`.
	const DEFAULT_VIEWPORT_PADDING = 8;

	let popoverTop = $state(0);
	let popoverLeft = $state(0);
	let popoverRight = $state(0);
	let panelWidth = $state(0);
	let placementResolved = $state(false);
	// svelte-ignore state_referenced_locally
	let effectiveDirection = $state<PopoverDirection>(direction);

	const readViewportPadding = (): number => {
		if (typeof window === 'undefined') {
			return DEFAULT_VIEWPORT_PADDING;
		}

		const raw = getComputedStyle(document.documentElement).getPropertyValue('--padding');

		const parsed = parseFloat(raw);

		return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_VIEWPORT_PADDING;
	};

	const initPosition = () => {
		if (typeof window === 'undefined') {
			return;
		}

		if (isNullish(anchor)) {
			popoverTop = 0;
			popoverLeft = 0;
			popoverRight = 0;
			effectiveDirection = direction;

			return;
		}

		const { bottom, left, right } = anchor.getBoundingClientRect();

		const viewportWidth = document.documentElement.clientWidth;

		const placement = computePopoverPlacement({
			anchorLeft: left,
			anchorRight: right,
			panelWidth,
			viewportWidth,
			viewportPadding: readViewportPadding(),
			preferredDirection: direction
		});

		popoverTop = bottom;
		popoverLeft = placement.left;
		popoverRight = placement.right;
		effectiveDirection = placement.direction;
	};

	$effect(() => {
		// Recompute the placement whenever the anchor, visibility or preferred direction changes.
		[anchor, visible, direction];
		initPosition();
	});

	const observePanelWidth = (node: HTMLElement) => {
		placementResolved = false;

		const measure = () => {
			const next = node.offsetWidth;

			if (next === panelWidth) {
				return;
			}

			panelWidth = next;

			initPosition();

			if (next > 0) {
				placementResolved = true;
			}
		};

		measure();

		if (typeof ResizeObserver === 'undefined') {
			return {};
		}

		const ro = new ResizeObserver(measure);

		ro.observe(node);

		return {
			destroy: () => {
				ro.disconnect();

				placementResolved = false;
				panelWidth = 0;
			}
		};
	};

	const close = () => {
		visible = false;
	};
</script>

<svelte:window onresize={initPosition} />

{#if visible}
	<div
		style="--popover-top: {popoverTop}px; --popover-left: {popoverLeft}px; --popover-right: {popoverRight}px"
		class="popover"
		aria-orientation="vertical"
		data-tid={testId}
		role="menu"
		tabindex="-1"
		transition:fade|global
	>
		<Backdrop invisible={invisibleBackdrop} onClose={close} />
		<div
			class="wrapper"
			class:placed={placementResolved}
			class:rtl={effectiveDirection === 'rtl'}
			class:with-border={invisibleBackdrop}
			use:observePanelWidth
			transition:scale|global={{ delay: 25, duration: 150, easing: quintOut }}
		>
			{#if closeButton}
				<button
					class="close icon-only"
					aria-label={$i18n.core.text.close}
					onclick={stopPropagation(close)}><IconClose /></button
				>
			{/if}

			<div class="popover-content" data-tid="popover-content">
				{@render children?.()}
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	@use '$lib/styles/mixins/display';

	.popover {
		position: fixed;
		@include display.inset;

		z-index: var(--overlay-z-index);

		// Folded in from the former gix.scss `div.popover` override layer (OISY-owned).
		--background-contrast: var(--overlay-background-contrast);
	}

	.wrapper {
		cursor: initial;

		// position
		position: absolute;
		top: calc(var(--popover-top) + var(--padding));
		left: var(--popover-left);

		// size
		--size: min(calc(20 * var(--padding)), calc(100vw - var(--padding)));

		min-width: var(--size);

		max-height: calc(var(--full-vh, 100vh) - var(--popover-top) - calc(6 * var(--padding)));

		width: fit-content;
		height: auto;

		display: flex;
		flex-direction: column;

		background-color: var(--dropdown-background);
		color: var(--background-contrast);

		// Folded in from the former gix.scss `div.popover .wrapper` override layer (OISY-owned):
		// tighter padding, a 16px radius, and a matching first-paint width cap.
		padding: var(--padding-0_5x);
		--padding: var(--padding-0_5x);
		--border-radius: 16px;

		border-radius: var(--border-radius);

		// Loose cap used during the first paint so we can measure the panel's
		// natural width. `.placed` swaps this for a side-aware cap that keeps the
		// panel inside the viewport on whichever side was chosen.
		max-width: calc(100vw - (2 * var(--padding)));

		@supports (height: 100dvh) {
			--full-vh: 100dvh;
		}

		&.rtl {
			left: auto;
			right: var(--popover-right);
		}

		// After the initial measurement, clamp the panel to the available room on
		// the chosen side so it never extends past the viewport edge.
		&.placed {
			max-width: calc(100vw - var(--popover-left) - var(--padding));
		}

		&.placed.rtl {
			max-width: calc(100vw - var(--popover-right) - var(--padding));
		}

		&.with-border {
			border: var(--dropdown-border-size) solid var(--dropdown-border-color);
		}
	}

	.close {
		align-self: flex-end;
	}

	.popover-content {
		overflow-y: auto;
	}
</style>
