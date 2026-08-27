import { PLAUSIBLE_EVENT_RESULT_STATUSES, PLAUSIBLE_EVENTS } from '$lib/enums/plausible';
import * as analytics from '$lib/services/analytics.services';
import { trackTip } from '$lib/services/tip-analytics.services';
import type { MockInstance } from 'vitest';

describe('trackTip', () => {
	let track: MockInstance;

	beforeEach(() => {
		vi.restoreAllMocks();
		track = vi.spyOn(analytics, 'trackEvent').mockImplementation(() => undefined);
	});

	it('emits one event name for every step, with the step as a modifier', () => {
		// The whole point of the shape: a funnel is only answerable if each step is
		// the same event. `trackPersonalNoteShare` replaced six flat event names with
		// this for exactly that reason.
		trackTip({ step: 'open', side: 'sender' });
		trackTip({ step: 'claim', side: 'claimer' });

		const names = track.mock.calls.map(([{ name }]) => name);

		expect(names).toEqual([PLAUSIBLE_EVENTS.TIP, PLAUSIBLE_EVENTS.TIP]);

		const modifiers = track.mock.calls.map(([{ metadata }]) => metadata?.event_modifier);

		expect(modifiers).toEqual(['open', 'claim']);
	});

	it('separates the two sides by source location', () => {
		trackTip({ step: 'open', side: 'sender' });
		trackTip({ step: 'open', side: 'claimer' });

		const [sender, claimer] = track.mock.calls.map(([{ metadata }]) => metadata?.source_location);

		expect(sender).toBe('tip_sender');
		expect(claimer).toBe('tip_claimer');
	});

	it('carries the claim outcome separately from the result status', () => {
		// A dead link and a live tip that could not be paid are both failures and
		// mean very different things about whether the sender needs telling.
		trackTip({
			step: 'claim',
			side: 'claimer',
			resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
			outcome: 'uncovered'
		});

		const [[{ metadata }]] = track.mock.calls;

		expect(metadata?.result_status).toBe(PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR);
		expect(metadata?.outcome).toBe('uncovered');
	});

	it('never carries an amount', () => {
		// A per-event figure would turn the analytics stream into a spending log.
		// The symbol answers "which assets are tipped" without doing that.
		trackTip({
			step: 'create',
			side: 'sender',
			resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
			expiry: 'expiry_24h',
			symbol: 'ICP'
		});

		const [[{ metadata }]] = track.mock.calls;

		expect(metadata?.symbol).toBe('ICP');
		expect(Object.keys(metadata ?? {})).not.toContain('amount');
	});

	it('omits fields that were not supplied', () => {
		trackTip({ step: 'copy', side: 'sender' });

		const [[{ metadata }]] = track.mock.calls;

		expect(metadata).not.toHaveProperty('result_status');
		expect(metadata).not.toHaveProperty('expiry');
		expect(metadata).not.toHaveProperty('result_error');
	});
});
