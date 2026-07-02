import { computePopoverPlacement, pickPopoverDirection } from '$lib/utils/popover.utils';

describe('pickPopoverDirection', () => {
	const viewportWidth = 1000;
	const viewportPadding = 8;

	it('returns the preferred direction when the panel has not been measured yet', () => {
		expect(
			pickPopoverDirection({
				anchorLeft: 900,
				anchorRight: 950,
				panelWidth: 0,
				viewportWidth,
				viewportPadding,
				preferredDirection: 'ltr'
			})
		).toBe('ltr');

		expect(
			pickPopoverDirection({
				anchorLeft: 10,
				anchorRight: 60,
				panelWidth: 0,
				viewportWidth,
				viewportPadding,
				preferredDirection: 'rtl'
			})
		).toBe('rtl');
	});

	it('keeps the preferred ltr direction when there is enough room on the right', () => {
		expect(
			pickPopoverDirection({
				anchorLeft: 100,
				anchorRight: 150,
				panelWidth: 300,
				viewportWidth,
				viewportPadding,
				preferredDirection: 'ltr'
			})
		).toBe('ltr');
	});

	it('keeps the preferred rtl direction when there is enough room on the left', () => {
		expect(
			pickPopoverDirection({
				anchorLeft: 800,
				anchorRight: 850,
				panelWidth: 300,
				viewportWidth,
				viewportPadding,
				preferredDirection: 'rtl'
			})
		).toBe('rtl');
	});

	it('flips from ltr to rtl when the preferred side overflows the viewport', () => {
		expect(
			pickPopoverDirection({
				anchorLeft: 900,
				anchorRight: 950,
				panelWidth: 300,
				viewportWidth,
				viewportPadding,
				preferredDirection: 'ltr'
			})
		).toBe('rtl');
	});

	it('flips from rtl to ltr when the preferred side overflows the viewport', () => {
		expect(
			pickPopoverDirection({
				anchorLeft: 10,
				anchorRight: 60,
				panelWidth: 300,
				viewportWidth,
				viewportPadding,
				preferredDirection: 'rtl'
			})
		).toBe('ltr');
	});

	it('falls back to the side with the most room when the panel fits on neither side', () => {
		expect(
			pickPopoverDirection({
				anchorLeft: 200,
				anchorRight: 300,
				panelWidth: 950,
				viewportWidth,
				viewportPadding,
				preferredDirection: 'ltr'
			})
		).toBe('ltr');

		expect(
			pickPopoverDirection({
				anchorLeft: 700,
				anchorRight: 800,
				panelWidth: 950,
				viewportWidth,
				viewportPadding,
				preferredDirection: 'rtl'
			})
		).toBe('rtl');
	});

	it('respects the viewport padding when checking fit', () => {
		expect(
			pickPopoverDirection({
				anchorLeft: 700,
				anchorRight: 750,
				panelWidth: 200,
				viewportWidth,
				viewportPadding,
				preferredDirection: 'ltr'
			})
		).toBe('ltr');

		expect(
			pickPopoverDirection({
				anchorLeft: 700,
				anchorRight: 750,
				panelWidth: 200,
				viewportWidth,
				viewportPadding: 150,
				preferredDirection: 'ltr'
			})
		).toBe('rtl');
	});
});

describe('computePopoverPlacement', () => {
	const viewportWidth = 1000;
	const viewportPadding = 8;

	it('aligns offsets to the raw anchor edges before the panel is measured', () => {
		expect(
			computePopoverPlacement({
				anchorLeft: 700,
				anchorRight: 750,
				panelWidth: 0,
				viewportWidth,
				viewportPadding,
				preferredDirection: 'ltr'
			})
		).toEqual({ direction: 'ltr', left: 700, right: 250 });
	});

	it('does not shift the panel when it naturally fits on the chosen side', () => {
		const ltrPlacement = computePopoverPlacement({
			anchorLeft: 100,
			anchorRight: 150,
			panelWidth: 300,
			viewportWidth,
			viewportPadding,
			preferredDirection: 'ltr'
		});

		expect(ltrPlacement.direction).toBe('ltr');
		expect(ltrPlacement.left).toBe(100);

		const rtlPlacement = computePopoverPlacement({
			anchorLeft: 800,
			anchorRight: 850,
			panelWidth: 300,
			viewportWidth,
			viewportPadding,
			preferredDirection: 'rtl'
		});

		expect(rtlPlacement.direction).toBe('rtl');
		expect(rtlPlacement.right).toBe(viewportWidth - 850);
	});

	it('shifts the ltr panel away from the right edge so it stays inside the viewport', () => {
		const placement = computePopoverPlacement({
			anchorLeft: 700,
			anchorRight: 750,
			panelWidth: 900,
			viewportWidth,
			viewportPadding,
			preferredDirection: 'ltr'
		});

		expect(placement.left).toBe(viewportWidth - viewportPadding - 900);
		expect(placement.left + 900).toBe(viewportWidth - viewportPadding);
	});

	it('shifts the rtl panel away from the left edge so it stays inside the viewport', () => {
		const placement = computePopoverPlacement({
			anchorLeft: 50,
			anchorRight: 100,
			panelWidth: 900,
			viewportWidth,
			viewportPadding,
			preferredDirection: 'rtl'
		});

		expect(placement.right).toBe(viewportWidth - viewportPadding - 900);
		expect(viewportWidth - placement.right - 900).toBe(viewportPadding);
	});

	it('pins the offset to viewportPadding when the panel is wider than the usable viewport', () => {
		const placement = computePopoverPlacement({
			anchorLeft: 700,
			anchorRight: 750,
			panelWidth: 1500,
			viewportWidth,
			viewportPadding,
			preferredDirection: 'ltr'
		});

		expect(placement.left).toBe(viewportPadding);
		expect(placement.right).toBe(viewportPadding);
	});

	it('respects the chosen direction returned by pickPopoverDirection', () => {
		const placement = computePopoverPlacement({
			anchorLeft: 900,
			anchorRight: 950,
			panelWidth: 300,
			viewportWidth,
			viewportPadding,
			preferredDirection: 'ltr'
		});

		expect(placement.direction).toBe('rtl');
	});
});
