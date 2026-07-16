import type {
	ActiveUserTransaction,
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

export const sortActiveUserTransactionsByCreatedAtDesc = (
	transactions: ActiveUserTransaction[]
): ActiveUserTransaction[] =>
	[...transactions].sort((a, b) =>
		a.created_at_ns < b.created_at_ns ? 1 : a.created_at_ns > b.created_at_ns ? -1 : 0
	);

export const activeUserTransactionsStateToList = (
	state: ActiveUserTransactionsStoreData
): ActiveUserTransaction[] => {
	if (isNullish(state)) {
		return [];
	}

	return sortActiveUserTransactionsByCreatedAtDesc(Object.values(state.data));
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
