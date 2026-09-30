import { PLAUSIBLE_EVENT_SEVERITIES, PLAUSIBLE_EVENTS } from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import type { XdrBasketPhase, XdrBasketStatus } from '$lib/types/exchange';

const XDR_BASKET_PHASE_SEVERITIES: Record<XdrBasketPhase, PLAUSIBLE_EVENT_SEVERITIES> = {
	// The basket's end date is within a week; TCYCLES's price is still exact.
	expiring_soon: PLAUSIBLE_EVENT_SEVERITIES.WARN,
	// The IMF's next basket applies, and TCYCLES's price drifts from the official XDR.
	grace: PLAUSIBLE_EVENT_SEVERITIES.WARN,
	// TCYCLES has no price until the basket amounts are updated.
	expired: PLAUSIBLE_EVENT_SEVERITIES.ERROR
};

/**
 * Counts down to the end of the XDR basket that prices TCYCLES, on every price refresh that
 * includes it, so that the new amounts ship before TCYCLES loses its price. It carries the phase,
 * the whole days left in it and its severity, and nothing about the user or their balance.
 */
export const trackXdrBasketExpiry = ({ phase, daysLeft }: XdrBasketStatus) => {
	trackEvent({
		name: PLAUSIBLE_EVENTS.XDR_BASKET_EXPIRY,
		metadata: {
			event_key: phase,
			event_value: String(daysLeft),
			event_severity: XDR_BASKET_PHASE_SEVERITIES[phase]
		}
	});
};
