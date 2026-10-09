import type {
	ActiveUserTransaction,
	ActiveUserTransactionError,
	ActiveUserTransactionRef,
	ActiveUserTransactionStatus
} from '$declarations/backend/backend.did';
import type { ActiveUserTransactionsStoreData } from '$lib/stores/active-user-transactions.store';
import { isNullish, nonNullish } from '@dfinity/utils';

export interface ActiveUserTransactionPollUpdate {
	status?: ActiveUserTransactionStatus;
	progressStep?: string;
	externalRefs?: ActiveUserTransactionRef[];
	error?: string;
}

export const isTerminalActiveUserTransactionStatus = (
	status: ActiveUserTransactionStatus
): boolean => 'Succeeded' in status || 'Failed' in status;

export const isTerminalActiveUserTransaction = (tx: ActiveUserTransaction): boolean =>
	isTerminalActiveUserTransactionStatus(tx.status);

type VariantOf<T> = T extends unknown ? keyof T : never;

// Every variant of the candid error. A `Record`, so a variant added to the interface fails to
// compile until it is listed here.
const ACTIVE_USER_TRANSACTION_ERROR_VARIANTS: Record<
	VariantOf<ActiveUserTransactionError>,
	null
> = {
	NotFound: null,
	AlreadyExists: null,
	TooManyActiveTransactions: null,
	InvalidId: null,
	InvalidData: null,
	IllegalStatusTransition: null,
	AlreadyInFlight: null
};

/**
 * Whether a failed call is the canister refusing it: the raw candid `Err` the canister throws. A
 * transport failure is not, and after one the call may still have committed.
 */
export const isActiveUserTransactionError = (err: unknown): err is ActiveUserTransactionError =>
	nonNullish(err) &&
	typeof err === 'object' &&
	Object.keys(ACTIVE_USER_TRANSACTION_ERROR_VARIANTS).some((variant) => variant in err);

// The timestamp a row is presented (and ordered) by: the moment it reached its
// last status, not the moment it was opened. A terminal row is never written
// again (the pollers only touch pending rows, and every flow persists learned
// refs *before* the terminal write), so `updated_at_ns` is exactly when it
// succeeded or failed. A still-running row keeps `created_at_ns`: its
// `updated_at_ns` also moves on ref / progress-step writes, which are not
// status changes, and "started x ago" is what we want to show there anyway.
export const activeUserTransactionTimestampNs = (tx: ActiveUserTransaction): bigint =>
	isTerminalActiveUserTransaction(tx) ? tx.updated_at_ns : tx.created_at_ns;

export const sortActiveUserTransactionsByTimestampDesc = (
	transactions: ActiveUserTransaction[]
): ActiveUserTransaction[] =>
	[...transactions].sort((a, b) => {
		const timestampA = activeUserTransactionTimestampNs(a);
		const timestampB = activeUserTransactionTimestampNs(b);

		return timestampA < timestampB ? 1 : timestampA > timestampB ? -1 : 0;
	});

export const activeUserTransactionsStateToList = (
	state: ActiveUserTransactionsStoreData
): ActiveUserTransaction[] => {
	if (isNullish(state)) {
		return [];
	}

	return sortActiveUserTransactionsByTimestampDesc(Object.values(state.data));
};

export const isActiveUserTransactionUnseen = ({
	state,
	tx
}: {
	state: ActiveUserTransactionsStoreData;
	tx: ActiveUserTransaction;
}): boolean => {
	if (isNullish(state)) {
		return false;
	}

	const seen = state.lastSeenUpdatedAtNs[tx.id];
	return isNullish(seen) || BigInt(seen) < tx.updated_at_ns;
};

// Succeeded and Failed share rank 2, so terminal states are immutable.
const statusRank = (status: ActiveUserTransactionStatus): number => {
	if ('Pending' in status) {
		return 0;
	}

	if ('Executing' in status) {
		return 1;
	}

	return 2;
};

// Returns the candidate only on a forward transition; same-rank or backwards
// candidates yield undefined.
export const advanceStatus = ({
	current,
	candidate
}: {
	current: ActiveUserTransactionStatus;
	candidate: ActiveUserTransactionStatus;
}): ActiveUserTransactionStatus | undefined => {
	if (statusRank(candidate) <= statusRank(current)) {
		return;
	}

	return candidate;
};

export const hasActiveUserTransactionPollUpdateChanges = (
	update: ActiveUserTransactionPollUpdate
): boolean => Object.values(update).some(nonNullish);
