import {
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_RESULT_STATUSES,
	PLAUSIBLE_EVENT_SEVERITIES,
	PLAUSIBLE_EVENT_SUBCONTEXT_TRANSACTIONS,
	PLAUSIBLE_EVENTS
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import type { Network } from '$lib/types/network';
import type { SolUnreadableTransaction } from '$sol/types/sol-transaction';

/**
 * A Solana transaction left out of the history because the RPC refused to return it, so that a new
 * kind of transaction OISY cannot read yet shows up before users report it. A warning, not an
 * error: the balances and the rest of the history are unaffected.
 *
 * It carries the network and the RPC's error code, and never the signature: a transaction names
 * the wallets it touched.
 */
export const trackSolUnreadableTransaction = ({
	network: { name: networkName },
	errorCode
}: {
	network: Network;
	errorCode: SolUnreadableTransaction['errorCode'];
}) => {
	trackEvent({
		name: PLAUSIBLE_EVENTS.LOAD_TRANSACTIONS,
		metadata: {
			event_context: PLAUSIBLE_EVENT_CONTEXTS.TRANSACTIONS,
			event_subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_TRANSACTIONS.UNREADABLE_SKIPPED,
			event_severity: PLAUSIBLE_EVENT_SEVERITIES.WARN,
			token_network: networkName,
			result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
			result_error_code: `${errorCode}`
		}
	});
};
