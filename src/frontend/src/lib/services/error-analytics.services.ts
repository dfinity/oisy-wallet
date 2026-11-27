import {
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_ERROR_SEVERITIES,
	PLAUSIBLE_EVENT_EVENTS_KEYS,
	PLAUSIBLE_EVENT_SUBCONTEXT_NETWORKS,
	PLAUSIBLE_EVENT_SUBCONTEXT_SWAP,
	PLAUSIBLE_EVENTS
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';

/**
 * The `error` event reports an invariant we believed unreachable. A flow that can legitimately
 * fail keeps its own event and reports the outcome through `result_status` instead — otherwise
 * `error` becomes a catch-all, fires constantly, and stops being worth alerting on.
 *
 * Every helper here must set `result_error_severity`, so the volume can be read by impact.
 */

const reportedNetworkSettingsKeys = new Set<string>();

/**
 * A `NetworkSettingsFor` key the backend persisted that this frontend has no `NetworkId` for.
 * The setting is ignored and every other network still maps, so the user notices nothing.
 *
 * Reported once per key per session. The callers run repeatedly — the profile is decoded on every
 * load and the settings store is a derived that recomputes on every write — but the signal is
 * that the key exists, not how many times we looked at it.
 */
export const trackUnmappedNetworkSettingsKey = ({ key }: { key: string }) => {
	if (reportedNetworkSettingsKeys.has(key)) {
		return;
	}

	reportedNetworkSettingsKeys.add(key);

	trackEvent({
		name: PLAUSIBLE_EVENTS.ERROR,
		metadata: {
			event_context: PLAUSIBLE_EVENT_CONTEXTS.NETWORKS,
			event_subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_NETWORKS.SETTINGS_KEY_UNMAPPED,
			event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.NETWORK,
			event_value: key,
			result_error_severity: PLAUSIBLE_EVENT_ERROR_SEVERITIES.MINOR
		}
	});
};

const reportedLifiBtcDeposits = new Set<string>();

/**
 * A LI.FI quote from BTC whose deposit pays another address than the one OISY pins for its bridge
 * (`tool`). Either the bridge moved its deposit address, and LI.FI from BTC through it is unusable
 * until the pin follows, or the answer was tampered with.
 *
 * `depositAddress` is the address the quote's deposit pays, as OISY decodes it from the transaction,
 * never LI.FI's text. It is the bridge's or a stranger's, never the user's own (the BTC decode refuses
 * a deposit to the user's address), and nothing is signed for it, so it ties the event to no wallet.
 * Many users reporting the same one says the bridge moved; a lone one, an answer tampered with.
 *
 * Reported once per bridge and address per session: the swap form re-quotes every few seconds.
 */
export const trackLifiBtcDepositUnverified = ({
	tool,
	depositAddress
}: {
	tool: string;
	depositAddress: string;
}) => {
	const key = `${tool}:${depositAddress}`;

	if (reportedLifiBtcDeposits.has(key)) {
		return;
	}

	reportedLifiBtcDeposits.add(key);

	trackEvent({
		name: PLAUSIBLE_EVENTS.ERROR,
		metadata: {
			event_context: PLAUSIBLE_EVENT_CONTEXTS.SWAP,
			event_subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_SWAP.LIFI_BTC_DEPOSIT_UNVERIFIED,
			event_provider: tool,
			event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.DEPOSIT_ADDRESS,
			event_value: depositAddress,
			result_error_severity: PLAUSIBLE_EVENT_ERROR_SEVERITIES.CRITICAL
		}
	});
};
