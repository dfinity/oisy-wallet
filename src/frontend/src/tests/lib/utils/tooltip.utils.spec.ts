import { translateTooltip } from '$lib/utils/tooltip.utils';

describe('tooltip.utils', () => {
	describe('translateTooltip', () => {
		// A 1000px-wide container anchored at the origin.
		const containerRect = new DOMRect(0, 0, 1000, 100);
		// The tooltip currently sits at the origin, so the returned translation
		// equals the computed absolute position.
		const tooltipRect = new DOMRect(0, 0, 80, 40);

		it('centers the tooltip below the target when it fits', () => {
			// target center = 400 + 100 / 2 = 450; x = 450 - 80 / 2 = 410
			const targetRect = new DOMRect(400, 200, 100, 50);

			const { x, y } = translateTooltip({
				containerRect,
				targetRect,
				tooltipRect,
				scrollbarWidth: 0
			});

			expect(x).toBe(410);
			// y defaults to the target bottom = 200 + 50
			expect(y).toBe(250);
		});

		it('places the tooltip above the target when top is set', () => {
			const targetRect = new DOMRect(400, 200, 100, 50);

			const { x, y } = translateTooltip({
				containerRect,
				targetRect,
				tooltipRect,
				scrollbarWidth: 0,
				top: true
			});

			expect(x).toBe(410);
			// y = target.y - tooltip.height = 200 - 40
			expect(y).toBe(160);
		});

		it('does not clamp to the container bounds when center is set', () => {
			// target center = 10; x = 10 - 40 = -30, which overflows on the left,
			// but center skips the clamping.
			const targetRect = new DOMRect(0, 200, 20, 50);

			const { x } = translateTooltip({
				containerRect,
				targetRect,
				tooltipRect,
				scrollbarWidth: 0,
				center: true
			});

			expect(x).toBe(-30);
		});

		it('clamps to the container left edge when overflowing left', () => {
			// Same overflowing target as above, but without center clamps to 0.
			const targetRect = new DOMRect(0, 200, 20, 50);

			const { x } = translateTooltip({
				containerRect,
				targetRect,
				tooltipRect,
				scrollbarWidth: 0
			});

			expect(x).toBe(0);
		});

		it('clamps to the container right edge when overflowing right', () => {
			// target center = 990; x = 950; 950 + 80 = 1030 > 1000, clamps to
			// containerRight - tooltip.width = 1000 - 80.
			const targetRect = new DOMRect(980, 200, 20, 50);

			const { x } = translateTooltip({
				containerRect,
				targetRect,
				tooltipRect,
				scrollbarWidth: 0
			});

			expect(x).toBe(920);
		});

		it('reduces the right edge by the scrollbar width', () => {
			// containerRight = 1000 - 20 = 980; clamps to 980 - 80 = 900.
			const targetRect = new DOMRect(980, 200, 20, 50);

			const { x } = translateTooltip({
				containerRect,
				targetRect,
				tooltipRect,
				scrollbarWidth: 20
			});

			expect(x).toBe(900);
		});

		it('returns a translation relative to the current tooltip position', () => {
			const targetRect = new DOMRect(400, 200, 100, 50);
			// The tooltip is already offset, so the returned values are the delta
			// to add to the existing transform.
			const offsetTooltipRect = new DOMRect(100, 50, 80, 40);

			const { x, y } = translateTooltip({
				containerRect,
				targetRect,
				tooltipRect: offsetTooltipRect,
				scrollbarWidth: 0
			});

			expect(x).toBe(410 - 100);
			expect(y).toBe(250 - 50);
		});
	});
});
