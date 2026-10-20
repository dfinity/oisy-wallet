<!-- Ported from @dfinity/gix-components Popover; originally based on
	 https://github.com/papyrs/papyrs/blob/main/src/lib/components/ui/Popover.svelte -->
<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { cubicIn, cubicOut } from 'svelte/easing';
	import IconClose from '$lib/components/icons/IconClose.svelte';
	import Backdrop from '$lib/components/ui/Backdrop.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { PopoverDirection, PopoverPlacement } from '$lib/types/popover';
	import { stopPropagation } from '$lib/utils/event-modifiers.utils';
	import { overlayFocus } from '$lib/utils/overlay.utils';
	import { computePopoverPlacement } from '$lib/utils/popover.utils';
	import { slidingHighlight } from '$lib/utils/sliding-highlight.utils';
	import { fade, scale } from '$lib/utils/transitions.utils';

	interface Props {
		anchor?: HTMLElement;
		visible?: boolean;
		direction?: PopoverDirection;
		placement?: PopoverPlacement;
		closeButton?: boolean;
		invisibleBackdrop?: boolean;
		dropdown?: boolean;
		testId?: string;
		children?: Snippet;
		ariaLabel?: string;
	}

	let {
		anchor,
		visible = $bindable(false),
		direction = 'ltr',
		placement = 'below',
		closeButton = false,
		invisibleBackdrop = false,
		dropdown = false,
		testId = 'popover-component',
		ariaLabel,
		children
	}: Props = $props();

	// Conservative fallback used only when `--padding` cannot be read (e.g. during SSR or
	// before the CSS variables are applied). The live value from
	// `src/lib/styles/global/variables.scss` (`round(0.45rem, 1px)`) is read at runtime and
	// takes precedence; this constant just guards that pre-paint edge case.
	const DEFAULT_VIEWPORT_PADDING = 8;

	let popoverTop = $state(0);
	// Distance from the viewport's bottom edge to the anchor's top edge: where an
	// `above` panel's own bottom edge sits.
	let popoverBottom = $state(0);
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
			popoverBottom = 0;
			popoverLeft = 0;
			popoverRight = 0;
			effectiveDirection = direction;

			return;
		}

		const { top, bottom, left, right } = anchor.getBoundingClientRect();

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
		popoverBottom = document.documentElement.clientHeight - top;
		popoverLeft = placement.left;
		popoverRight = placement.right;
		effectiveDirection = placement.direction;
	};

	$effect(() => {
		// Recompute the placement whenever the anchor, visibility or preferred direction changes.
		[anchor, visible, direction, placement];
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

		const reset = () => {
			placementResolved = false;
			panelWidth = 0;
		};

		if (typeof ResizeObserver === 'undefined') {
			// Still reset state on unmount so a later re-mount re-measures from scratch.
			return { destroy: reset };
		}

		const ro = new ResizeObserver(measure);

		ro.observe(node);

		return {
			destroy: () => {
				ro.disconnect();

				reset();
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
		style="--popover-top: {popoverTop}px; --popover-bottom: {popoverBottom}px; --popover-left: {popoverLeft}px; --popover-right: {popoverRight}px"
		class="popover"
		data-tid={testId}
		in:fade|global={{ duration: 25 }}
	>
		<Backdrop invisible={invisibleBackdrop} onClose={close} />
		<div
			class="wrapper"
			class:above={placement === 'above'}
			class:dropdown
			class:placed={placementResolved}
			class:rtl={effectiveDirection === 'rtl'}
			aria-label={ariaLabel ?? anchor?.getAttribute('aria-label') ?? $i18n.navigation.alt.menu}
			aria-modal="true"
			role="dialog"
			tabindex="-1"
			use:observePanelWidth
			use:overlayFocus={{ onClose: close, returnFocus: anchor }}
			in:scale|global={{ delay: 25, duration: 150, easing: cubicOut, start: 0.96 }}
			out:scale|global={{ duration: 100, easing: cubicIn, start: 0.96 }}
		>
			{#if closeButton}
				<button
					class="close icon-only hit-area relative press-icon"
					aria-label={$i18n.core.text.close}
					onclick={stopPropagation(close)}
					type="button"><IconClose /></button
				>
			{/if}

			<div class="popover-content" data-tid="popover-content" use:slidingHighlight={dropdown}>
				{@render children?.()}
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	@use '$lib/styles/mixins/display';
	@use '$lib/styles/mixins/interaction';

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
		// a 16px radius, a matching first-paint width cap, and `--padding` scaled to 0.5x so the
		// placement calcs and inner content inherit the tighter unit. The wrapper's own box padding
		// stays at `--padding-2x`: in gix the override's `padding` declaration lost specificity to
		// gix's base `.wrapper { padding: var(--padding-2x) }`, so 2x is what actually rendered.
		padding: var(--padding-2x);
		--padding: var(--padding-0_5x);
		--border-radius: 16px;

		border-radius: var(--border-radius);
		box-shadow: var(--overlay-box-shadow);

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

		// Anchored by its bottom edge to the anchor's top, and capped by the room
		// above it rather than below — the mirror of the default placement.
		&.above {
			top: auto;
			bottom: calc(var(--popover-bottom) + var(--padding));
			max-height: calc(var(--full-vh, 100vh) - var(--popover-bottom) - calc(6 * var(--padding)));
		}

		// After the initial measurement, clamp the panel to the available room on
		// the chosen side so it never extends past the viewport edge.
		&.placed {
			max-width: calc(100vw - var(--popover-left) - var(--padding));
		}

		&.placed.rtl {
			max-width: calc(100vw - var(--popover-right) - var(--padding));
		}

		@media (forced-colors: active) {
			border: 1px solid CanvasText;
		}
	}

	// Dropdowns and short option menus: an 8px inset instead of the menus' 14px, so the 8px-cornered
	// rows and search box sit concentric in the 16px corners. Everything inside takes its
	// density from these properties: menu-surface rows (global/menus.scss), ListItemCheckbox, Toggle
	// rows and the shared InputSearch (InputBase hooks). Rows are 36px with a 12px inset, in line
	// with the search text, and 44px on a touch screen.
	.wrapper.dropdown {
		padding: 8px;

		.popover-content {
			--border-radius: 8px;
			--menu-row-min-height: 36px;
			--menu-row-padding-block: 6px;
			--menu-row-padding-inline: 12px;
			--input-padding-block: 7px;
			--input-padding-inline: 11px;
			--input-padding-inner-end: 40px;
			// InputSearch renders an empty label row above the box; its gap would push the box down.
			--input-block-gap: 0;

			// Rows only ever stack: never offer a horizontal scrollbar for a fraction of a pixel.
			overflow-x: hidden;

			@include interaction.coarse {
				--menu-row-min-height: var(--touch-target-min-height);
				--menu-row-padding-block: 10px;
				--input-padding-block: 9px;
			}
		}

		// Compact rows go without dividers; `.menu-divider` between groups stays.
		.popover-content :global(li) {
			border-bottom-width: 0;
		}
	}

	// The block `slidingHighlight` moves between rows (sliding-highlight.utils.ts). It sits behind
	// them, so the elements that paint a row's own hover or focus fill (the row, a list item's child,
	// a `row-feedback` control, a LogoButton's wrapper) stay transparent while it is there. Row styles live in the base and utility layers, which these
	// unlayered rules out-rank; ListItemCheckbox's own unlayered hover loses on specificity. The
	// block sits in the content itself, or in a list that scrolls on its own inside it.
	.popover-content:global([data-sliding-highlight]) {
		position: relative;
		isolation: isolate;
	}

	.popover-content:global([data-sliding-highlight]) :global {
		[data-sliding-highlight-list] {
			position: relative;
			isolation: isolate;
		}

		:is(li, li > *, .menu-row, .row-feedback, :has(> button > .logo-button-wrapper)) {
			&:focus-visible:not(:active) {
				background-color: transparent;
			}

			@include interaction.hover {
				&:not(:active) {
					background-color: transparent;
				}
			}
		}

		.sliding-highlight {
			position: absolute;
			top: 0;
			left: 0;
			z-index: -1;

			width: var(--highlight-width);
			height: var(--highlight-height);
			translate: var(--highlight-x) var(--highlight-y);

			margin: 0;
			padding: 0;
			list-style: none;
			border-radius: 8px;
			background-color: var(--color-background-brand-subtle-10);
			pointer-events: none;

			opacity: 0;
			transition: opacity 0.1s ease-out;

			&.visible {
				opacity: 1;
			}

			// Reduced motion keeps only the fade: the block jumps to the next row.
			@media (prefers-reduced-motion: no-preference) {
				&:not(.instant) {
					transition:
						translate 0.15s cubic-bezier(0.2, 0, 0, 1),
						width 0.15s cubic-bezier(0.2, 0, 0, 1),
						height 0.15s cubic-bezier(0.2, 0, 0, 1),
						opacity 0.1s ease-out;
				}
			}
		}
	}

	// While a row is pressed, by pointer or keyboard, the block fades out as the row's own pressed
	// fill fades in, so the two never add up. Any button counts: a keyboard press makes only the
	// button active, not the list item around it.
	.popover-content:global([data-sliding-highlight]:has(:is(li, a, button, .row-feedback):active))
		:global(.sliding-highlight) {
		opacity: 0;
	}

	.close {
		align-self: flex-end;
	}

	.popover-content {
		overflow-y: auto;
		overscroll-behavior: contain;
	}
</style>
