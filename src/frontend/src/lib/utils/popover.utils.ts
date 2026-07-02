import type { PopoverDirection } from '$lib/types/popover';

export interface PickPopoverPlacementParams {
	/** Anchor's left edge relative to the viewport (e.g. `getBoundingClientRect().left`). */
	anchorLeft: number;
	/** Anchor's right edge relative to the viewport (e.g. `getBoundingClientRect().right`). */
	anchorRight: number;
	/** Measured width of the popover panel. Pass `0` when not yet measured. */
	panelWidth: number;
	/** Viewport width excluding the vertical scrollbar (`document.documentElement.clientWidth`). */
	viewportWidth: number;
	/** Minimum margin (in px) we want to keep between the panel and the viewport edge. */
	viewportPadding: number;
	/** Consumer-requested side; treated as a preference and honored when it fits. */
	preferredDirection: PopoverDirection;
}

export interface PopoverPlacement {
	/** The side the panel grows toward. */
	direction: PopoverDirection;
	/** Distance (px) from the viewport's left edge to the panel's left edge. */
	left: number;
	/** Distance (px) from the viewport's right edge to the panel's right edge. */
	right: number;
}

/**
 * Picks the side the popover panel should grow toward.
 *
 * The `preferredDirection` is honored when the panel fits within the viewport
 * on that side. If it would overflow, we flip to the opposite side when that
 * one fits. When neither side can contain the panel in full at the anchor's
 * edge, we fall back to the side that leaves the most room.
 *
 * When `panelWidth` is `0` (not measured yet) we return the preferred side
 * unchanged so that the first paint matches today's behavior.
 */
export const pickPopoverDirection = ({
	anchorLeft,
	anchorRight,
	panelWidth,
	viewportWidth,
	viewportPadding,
	preferredDirection
}: PickPopoverPlacementParams): PopoverDirection => {
	if (panelWidth <= 0) {
		return preferredDirection;
	}

	const ltrFits = anchorLeft + panelWidth <= viewportWidth - viewportPadding;
	const rtlFits = anchorRight - panelWidth >= viewportPadding;

	if (preferredDirection === 'ltr') {
		if (ltrFits) {
			return 'ltr';
		}

		if (rtlFits) {
			return 'rtl';
		}
	} else {
		if (rtlFits) {
			return 'rtl';
		}

		if (ltrFits) {
			return 'ltr';
		}
	}

	const ltrRoom = viewportWidth - viewportPadding - anchorLeft;
	const rtlRoom = anchorRight - viewportPadding;

	return rtlRoom > ltrRoom ? 'rtl' : 'ltr';
};

/**
 * Computes a viewport offset for one edge of the panel. When the anchor offset
 * would push the panel past the opposite viewport edge, we "shift" the panel
 * toward the viewport's interior so it stays inside at its natural width.
 * If the panel is wider than the viewport's usable room, we pin the offset to
 * `viewportPadding`; the caller is then expected to clamp the panel's width
 * via CSS as a last resort.
 */
const shiftEdgeOffset = ({
	anchorOffset,
	panelWidth,
	viewportWidth,
	viewportPadding
}: {
	anchorOffset: number;
	panelWidth: number;
	viewportWidth: number;
	viewportPadding: number;
}): number => {
	const maxOffsetThatFits = viewportWidth - viewportPadding - panelWidth;

	if (anchorOffset <= maxOffsetThatFits) {
		return anchorOffset;
	}

	return Math.max(viewportPadding, maxOffsetThatFits);
};

/**
 * Returns the panel's effective left/right offsets relative to the viewport
 * edges, after running:
 *
 *   1. `pickPopoverDirection` to choose the side.
 *   2. A "shift" step: when the natural-width panel would overflow the chosen
 *      side, translate the panel along the cross-axis so it stays inside the
 *      viewport (with a `viewportPadding` margin) at its full natural width.
 *
 * If even after shifting the panel is wider than the viewport's usable room,
 * the offsets are pinned to `viewportPadding`. The caller is then expected to
 * clamp the panel's width via CSS as a last resort.
 */
export const computePopoverPlacement = (params: PickPopoverPlacementParams): PopoverPlacement => {
	const direction = pickPopoverDirection(params);

	const { anchorLeft, anchorRight, panelWidth, viewportWidth, viewportPadding } = params;

	const anchorFromRight = viewportWidth - anchorRight;

	if (panelWidth <= 0) {
		return { direction, left: anchorLeft, right: anchorFromRight };
	}

	return {
		direction,
		left: shiftEdgeOffset({
			anchorOffset: anchorLeft,
			panelWidth,
			viewportWidth,
			viewportPadding
		}),
		right: shiftEdgeOffset({
			anchorOffset: anchorFromRight,
			panelWidth,
			viewportWidth,
			viewportPadding
		})
	};
};
