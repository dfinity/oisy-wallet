interface TranslateTooltipParams {
	containerRect: DOMRect;
	targetRect: DOMRect;
	tooltipRect: DOMRect;
	scrollbarWidth: number;
	top?: boolean;
	center?: boolean;
}

/**
 * Returns how much the tooltip should be translated in the x and y directions
 * based on its current position. If the tooltip already has non-zero
 * translation, the returned values should be added to the current translation.
 *
 * The translation should be such that the tooltip remains within the bounds of
 * the container, centered on the target if possible.
 */
export const translateTooltip = (params: TranslateTooltipParams): { x: number; y: number } => {
	const newTooltipPosition = getNewTooltipPosition(params);
	return {
		x: newTooltipPosition.x - params.tooltipRect.x,
		y: newTooltipPosition.y - params.tooltipRect.y
	};
};

const getNewTooltipPosition = ({
	containerRect,
	targetRect,
	tooltipRect,
	scrollbarWidth,
	top = false,
	center = false
}: TranslateTooltipParams): { x: number; y: number } => {
	let newTooltipY = targetRect.bottom;
	if (top) {
		newTooltipY = targetRect.y - tooltipRect.height;
	}
	// By default the tooltip center is aligned with the target center.
	const targetCenter = targetRect.x + targetRect.width / 2;
	let newTooltipX = targetCenter - tooltipRect.width / 2;
	if (center) {
		return {
			x: newTooltipX,
			y: newTooltipY
		};
	}

	// If the tooltip falls outside the container, we need to adjust.
	const containerRight = containerRect.x + containerRect.width - scrollbarWidth;
	if (newTooltipX < containerRect.x) {
		newTooltipX = containerRect.x;
	} else if (newTooltipX + tooltipRect.width > containerRight) {
		newTooltipX = containerRight - tooltipRect.width;
	}

	return {
		x: newTooltipX,
		y: newTooltipY
	};
};
