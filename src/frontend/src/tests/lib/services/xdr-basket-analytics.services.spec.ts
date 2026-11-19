import { PLAUSIBLE_EVENTS } from '$lib/enums/plausible';
import * as analytics from '$lib/services/analytics.services';
import { trackXdrBasketExpiry } from '$lib/services/xdr-basket-analytics.services';
import type { MockInstance } from 'vitest';

describe('trackXdrBasketExpiry', () => {
	let track: MockInstance;

	beforeEach(() => {
		vi.restoreAllMocks();
		track = vi.spyOn(analytics, 'trackEvent').mockImplementation(() => undefined);
	});

	it.each([
		{ phase: 'expiring_soon', daysLeft: 7, severity: 'warn' },
		{ phase: 'grace', daysLeft: 61, severity: 'warn' },
		{ phase: 'expired', daysLeft: 0, severity: 'error' }
	] as const)(
		'sends $phase with $daysLeft days left at severity $severity, and nothing else',
		({ phase, daysLeft, severity }) => {
			trackXdrBasketExpiry({ phase, daysLeft });

			expect(track).toHaveBeenCalledExactlyOnceWith({
				name: PLAUSIBLE_EVENTS.XDR_BASKET_EXPIRY,
				metadata: {
					event_key: phase,
					event_value: String(daysLeft),
					event_severity: severity
				}
			});
		}
	);
});
