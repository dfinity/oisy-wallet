import {
	PLAUSIBLE_EVENT_ERROR_SEVERITIES,
	PLAUSIBLE_EVENT_RESULT_STATUSES,
	PLAUSIBLE_EVENT_SEVERITIES,
	PLAUSIBLE_EVENT_SUBCONTEXT_TRANSACTION_LOAD,
	PLAUSIBLE_EVENT_TRANSACTION_LOAD_ERROR_TYPES,
	PLAUSIBLE_EVENTS
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import type { Network } from '$lib/types/network';
import type {
	SolUnreadableTransaction,
	SolUnreadableTransactionReason
} from '$sol/types/sol-transaction';
import { nonNullish } from '@dfinity/utils';

const ERROR_TYPES: Record<
	SolUnreadableTransactionReason,
	PLAUSIBLE_EVENT_TRANSACTION_LOAD_ERROR_TYPES
> = {
	refused: PLAUSIBLE_EVENT_TRANSACTION_LOAD_ERROR_TYPES.LOAD_REFUSED,
	unparsable: PLAUSIBLE_EVENT_TRANSACTION_LOAD_ERROR_TYPES.PARSE_FAILED
};

/**
 * A Solana transaction left out of the history because the RPC refused to return it, or OISY failed
 * to read it, so that a new kind of transaction OISY cannot read yet shows up before users report
 * it. A warning: the
 * balances and the rest of the history are unaffected. A major error all the same, since it does
 * not resolve itself: only a change to OISY makes the transaction readable.
 *
 * It carries the network, why it failed and the RPC's error code if any, and never the signature: a
 * transaction names the wallets it touched.
 */
export const trackSolUnreadableTransaction = ({
	network: { name: networkName },
	reason,
	errorCode
}: {
	network: Network;
} & Pick<SolUnreadableTransaction, 'reason' | 'errorCode'>) => {
	trackEvent({
		name: PLAUSIBLE_EVENTS.TRANSACTION_LOAD,
		metadata: {
			event_subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_TRANSACTION_LOAD.SINGLE,
			event_severity: PLAUSIBLE_EVENT_SEVERITIES.WARN,
			token_network: networkName,
			result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
			result_error_severity: PLAUSIBLE_EVENT_ERROR_SEVERITIES.MAJOR,
			result_error_type: ERROR_TYPES[reason],
			...(nonNullish(errorCode) && { result_error_code: `${errorCode}` })
		}
	});
};
