import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import { isTerminalActiveUserTransaction } from '$lib/utils/active-user-transactions.utils';
import type { XrpAddress } from '$xrp/types/address';
import { fromNullable } from '@dfinity/utils';

/**
 * The XRP address a row's payment is sent from, for the rows that make one: an XRP send, and a
 * NEAR Intents swap whose deposit is an XRP payment. With `holdsXrpAddress`, the one place that
 * knows which rows those are — a new kind of row that makes an XRP payment is added here and
 * nowhere else. The backend's `xrp_payment_source` and `holds_xrp_address` make the same call.
 */
const xrpPaymentSource = (tx: ActiveUserTransaction): string | undefined => {
	if ('Xrp' in tx.data) {
		return tx.data.Xrp.source_address;
	}

	if ('NearIntents' in tx.data) {
		return fromNullable(tx.data.NearIntents.source_address);
	}

	return undefined;
};

/**
 * Whether a row's XRP payment can still apply. A send's can until the row is terminal, and
 * terminality comes from `isTerminalActiveUserTransaction` so there is one definition of it. A
 * swap's deposit can only while the row is `Pending`: once the deposit validates the row moves to
 * `Executing`, and the swap goes on at 1Click without holding the address.
 */
const holdsXrpAddress = (tx: ActiveUserTransaction): boolean => {
	if ('Xrp' in tx.data) {
		return !isTerminalActiveUserTransaction(tx);
	}

	if ('NearIntents' in tx.data) {
		return 'Pending' in tx.status;
	}

	return false;
};

/**
 * The row whose XRP payment from `source` can still apply, if there is one.
 *
 * Per **address**, not per user: a payment from a different address says nothing about this one's
 * sequence, and refusing on it would block an unrelated payment. Compared raw, like everywhere
 * else this address travels — a classic address is base58 over a checksummed payload, so case is
 * significant.
 */
export const xrpPaymentInFlight = ({
	transactions,
	source
}: {
	transactions: ActiveUserTransaction[];
	source: XrpAddress;
}): ActiveUserTransaction | undefined =>
	transactions.find((tx) => xrpPaymentSource(tx) === source && holdsXrpAddress(tx));
