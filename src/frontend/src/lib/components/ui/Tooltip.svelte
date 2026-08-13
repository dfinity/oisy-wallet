<script lang="ts" module>
	let nextTooltipIdSuffix = 0;
</script>

<script lang="ts">
	import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
	import { onDestroy, onMount, type Snippet } from 'svelte';
	import { translateTooltip } from '$lib/utils/tooltip.utils';

	interface Props {
		id?: string;
		idPrefix?: string;
		testId?: string;
		text?: string;
		noWrap?: boolean;
		top?: boolean;
		center?: boolean;
		children?: Snippet;
		tooltipContent?: Snippet;
	}

	let {
		id,
		idPrefix = 'tooltip',
		testId = 'tooltip-component',
		text,
		noWrap = false,
		top = false,
		center = false,
		children,
		tooltipContent
	}: Props = $props();

	let tooltipComponent = $state<HTMLDivElement | undefined>();
	let target = $state<HTMLDivElement | undefined>();
	let targetIsHovered = $state(false);
	let tooltipTransformX = $state(0);
	let tooltipTransformY = $state(0);

	// svelte-ignore state_referenced_locally
	const idToUse = nonNullish(id) ? id : `${idPrefix}-${nextTooltipIdSuffix++}`;

	let isAbsent = $derived(isNullish(tooltipContent) && !notEmptyString(text));

	let tooltipStyle = $derived(
		`--tooltip-transform-x: ${tooltipTransformX}px; --tooltip-transform-y: ${tooltipTransformY}px;`
	);

	let destroyed = false;

	const setPosition = () => {
		// The position update might effectively happen after the component has been destroyed, this is
		// particularly the case in unit tests. That is why we guard against acting on a destroyed Tooltip.
		if (destroyed) {
			return;
		}

		if (isAbsent) {
			return;
		}

		if (isNullish(tooltipComponent) || isNullish(target)) {
			// Do nothing, we need the elements to be rendered in order to get their size and position to fix the tooltip
			return;
		}

		const container = document.body;

		const { clientWidth, offsetWidth } = container;
		const scrollbarWidth = offsetWidth - clientWidth;

		const { x, y } = translateTooltip({
			containerRect: container.getBoundingClientRect(),
			targetRect: target.getBoundingClientRect(),
			tooltipRect: tooltipComponent.getBoundingClientRect(),
			scrollbarWidth,
			top,
			center
		});

		// The calculation is based on the current position so the returned
		// transform should be added to the existing one.
		tooltipTransformX += x;
		tooltipTransformY += y;
	};

	const onMouseEnter = () => {
		setPosition();
		targetIsHovered = true;
	};

	const onMouseLeave = () => {
		targetIsHovered = false;
	};

	const moveTooltipToBody = () => {
		// Move tooltip to the body to avoid it being cut off by `overflow: hidden` ancestors.
		// Skip when it is already a direct child of the body, so we don't needlessly re-order
		// tooltips (appendChild moves the node to the end) or do redundant DOM work on every effect.
		if (nonNullish(tooltipComponent) && tooltipComponent.parentElement !== document.body) {
			document.body.appendChild(tooltipComponent);
		}
	};

	onMount(() => {
		moveTooltipToBody();
		// If the pointer is already over the target when the tooltip mounts (e.g. a DelayedTooltip
		// activating after its delay), `mouseenter` won't fire — reflect the hovered state now.
		if (target?.matches(':hover') === true) {
			onMouseEnter();
		}
	});

	$effect(() => {
		// Re-attach to the body after re-renders, mirroring the legacy afterUpdate.
		[tooltipStyle, targetIsHovered, isAbsent];
		moveTooltipToBody();
	});

	onDestroy(() => {
		destroyed = true;
		// Remove the tooltip from <body> where it was relocated.
		// eslint-disable-next-line svelte/no-dom-manipulating
		tooltipComponent?.remove();
	});
</script>

<!-- See test "should not add whitespace" -->
<!-- prettier-ignore -->
<div class="tooltip-wrapper" data-tid={testId}>
  <div
    bind:this={target}
    class="tooltip-target"
    aria-describedby={idToUse}
    onmouseenter={onMouseEnter}
    onmouseleave={onMouseLeave}
    role="presentation"
    title="">{@render children?.()}</div
  ><div
    bind:this={tooltipComponent}
    id={idToUse}
    style={tooltipStyle}
    class="tooltip"
    class:noWrap
    class:not-rendered={isAbsent}
    class:top
    class:visible={targetIsHovered}
    role="tooltip"
    >{#if nonNullish(text)}{text}{/if}{@render tooltipContent?.()}</div
  ></div
>

<style lang="scss">
	.tooltip-wrapper {
		position: relative;
		display: var(--tooltip-display, block);
		width: var(--tooltip-width);
	}

	.tooltip {
		z-index: var(--tooltip-z-index);

		position: absolute;
		display: inline-block;

		transform: translate(var(--tooltip-transform-x, 0), var(--tooltip-transform-y, 0));

		opacity: 0;
		visibility: hidden;
		transition:
			opacity 150ms,
			visibility 150ms;

		padding: 4px 6px;
		border-radius: 4px;
		border: var(--tooltip-border-size) solid var(--tooltip-border-color);

		font-size: var(--font-size-small);

		background: var(--tooltip-background);
		color: var(--tooltip-text-color);

		// limit width
		white-space: pre-wrap;
		max-width: 240px;
		width: max-content;
		overflow-wrap: break-word;

		pointer-events: none;

		&.noWrap {
			white-space: nowrap;
		}

		&.not-rendered {
			display: none;
		}

		&.visible {
			opacity: 1;
			visibility: initial;
		}
	}

	.tooltip-target {
		height: 100%;
	}
</style>
