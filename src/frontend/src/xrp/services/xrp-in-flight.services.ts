import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import { getActiveUserTransactions } from '$lib/api/backend.api';
import { activeUserTransactionsStore } from '$lib/stores/active-user-transactions.store';
import type { NullishIdentity } from '$lib/types/identity';
import type { XrpAddress } from '$xrp/types/address';
import { XrpSendAlreadyInFlightError, XrpSendNotGuardedError } from '$xrp/types/xrp-send';
import { xrpPaymentInFlight } from '$xrp/utils/xrp-in-flight.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';

/**
 * Refuses an XRP payment — a send, or a swap's deposit — while another payment from the same
 * address has not resolved yet.
 *
 * The gate is per **address**, not per user: a payment from a different address says nothing about
 * this one's sequence, and refusing on it would block an unrelated one. There is no override — the
 * whole point is that no second sequence is safe while the first payment is open.
 */
export const assertNoXrpPaymentInFlight = async ({
	identity,
	source
}: {
	identity: NullishIdentity;
	source: XrpAddress;
}): Promise<Identity> => {
	// Fails closed. Without an identity the record can neither be read nor written, so the
	// invariant cannot be held — and an unguarded payment is the failure this path exists to prevent.
	if (isNullish(identity)) {
		throw new XrpSendNotGuardedError(
			'XRP send refused: the wallet could not check for an unresolved payment without an identity.'
		);
	}

	// `loadActiveUserTransactions` swallows backend errors by design, so a failed load leaves the
	// store as it was — which would read as "no open record". Asked directly instead: this answer
	// decides whether a second sequence is signed, so it must come from the backend or not at all.
	let transactions: ActiveUserTransaction[];

	try {
		transactions = await getActiveUserTransactions({ identity });
	} catch (err: unknown) {
		throw new XrpSendNotGuardedError(
			`XRP send refused: the wallet could not check for an unresolved payment. ${
				err instanceof Error ? err.message : `${err}`
			}`
		);
	}

	const open = xrpPaymentInFlight({ transactions, source });

	if (nonNullish(open)) {
		// Handed to the store before refusing. The store loads only when the identity changes, and the
		// poller polls only what is in it, so a record opened by another tab — which may since have
		// closed — would otherwise never be resolved here, and this refusal would repeat on every
		// attempt. `upsert` keeps a local copy with a newer `updated_at_ns`, so a row this tab already
		// tracks further along is not rolled back to the backend's older answer.
		activeUserTransactionsStore.upsert({ transaction: open });

		throw new XrpSendAlreadyInFlightError(
			`XRP send refused: a payment from ${source} has not resolved yet.`
		);
	}

	return identity;
};
