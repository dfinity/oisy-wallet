import { PLAUSIBLE_EVENTS } from '$lib/enums/plausible';
import { trackOisyAllowanceRequest } from '$lib/services/allowance-analytics.services';
import * as analytics from '$lib/services/analytics.services';
import type { MockInstance } from 'vitest';

describe('trackOisyAllowanceRequest', () => {
	let track: MockInstance;

	beforeEach(() => {
		vi.restoreAllMocks();
		track = vi.spyOn(analytics, 'trackEvent').mockImplementation(() => undefined);
	});

	it.each([
		{ answer: 'granted', outcome: 'repeated' },
		{ answer: 'skipped', outcome: 'repeat_failed' },
		{ answer: 'refused', outcome: 'not_repeated' }
	] as const)('sends $answer with $outcome, and nothing else', ({ answer, outcome }) => {
		trackOisyAllowanceRequest({ answer, outcome });

		expect(track).toHaveBeenCalledExactlyOnceWith({
			name: PLAUSIBLE_EVENTS.OISY_ALLOWANCE_REQUEST,
			metadata: { event_key: answer, event_value: outcome }
		});
	});
});
