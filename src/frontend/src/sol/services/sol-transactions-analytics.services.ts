import {
	PLAUSIBLE_EVENT_ERROR_SEVERITIES,
	PLAUSIBLE_EVENT_RESULT_STATUSES,
	PLAUSIBLE_EVENT_SEVERITIES,
	PLAUSIBLE_EVENT_SUBCONTEXT_TRANSACTION_LOAD,
	PLAUSIBLE_EVENTS
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import type { Network } from '$lib/types/network';
import type { SolUnreadableTransaction } from '$sol/types/sol-transaction';

/**
 * A Solana transaction left out of the history because the RPC refused to return it, so that a new
 * kind of transaction OISY cannot read yet shows up before users report it. A warning: the
 * balances and the rest of the history are unaffected. A major error all the same, since it does
 * not resolve itself: only a change to OISY makes the transaction readable.
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
		name: PLAUSIBLE_EVENTS.TRANSACTION_LOAD,
		metadata: {
			event_subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_TRANSACTION_LOAD.SINGLE,
			event_severity: PLAUSIBLE_EVENT_SEVERITIES.WARN,
			token_network: networkName,
			result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
			result_error_severity: PLAUSIBLE_EVENT_ERROR_SEVERITIES.MAJOR,
			result_error_code: `${errorCode}`
		}
	});
};
