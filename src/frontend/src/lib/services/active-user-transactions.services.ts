import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import {
	createActiveUserTransaction as createActiveUserTransactionApi,
	deleteActiveUserTransaction as deleteActiveUserTransactionApi,
	getActiveUserTransactions,
	markActiveUserTransactionsSeen as markActiveUserTransactionsSeenApi,
	updateActiveUserTransaction as updateActiveUserTransactionApi
} from '$lib/api/backend.api';
import { activeUserTransactionsStore } from '$lib/stores/active-user-transactions.store';
import type {
	CreateActiveUserTransactionParams,
	UpdateActiveUserTransactionParams
} from '$lib/types/api';
import type { NullishIdentity } from '$lib/types/identity';
import {
	hasActiveUserTransactionPollUpdateChanges,
	isActiveUserTransactionError,
	isTerminalActiveUserTransactionStatus,
	type ActiveUserTransactionPollUpdate
} from '$lib/utils/active-user-transactions.utils';
import { consoleError } from '$lib/utils/console.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';
import { get } from 'svelte/store';

/**
 * Loads the caller's active user transactions into the store. Resets the
 * store on nullish identity and swallows backend errors (best-effort —
 * callers read the store directly).
 */
export const loadActiveUserTransactions = async ({
	identity
}: {
	identity: NullishIdentity;
}): Promise<void> => {
	if (isNullish(identity)) {
		activeUserTransactionsStore.reset();

		return;
	}

	activeUserTransactionsStore.init(identity.getPrincipal());

	// Marked before the read, so a row created or updated while it is in flight survives a snapshot
	// taken before that write committed.
	const since = activeUserTransactionsStore.beginLoad();

	try {
		const { transactions, seen_up_to_ns: seenUpToNs } = await getActiveUserTransactions({
			identity
		});

		activeUserTransactionsStore.set({ transactions, since, seenUpToNs });
	} catch (err: unknown) {
		consoleError(err);
	}
};

// An account switch during the call leaves the store holding another principal's rows, whose loader
// would report this one as its own. The row is left to its account's next load instead.
const upsertForIdentity = ({
	identity,
	transaction
}: {
	identity: Identity;
	transaction: ActiveUserTransaction;
}) => {
	if (!activeUserTransactionsStore.holds(identity.getPrincipal())) {
		return;
	}

	activeUserTransactionsStore.upsert({ transaction });
};

export const createActiveUserTransaction = async ({
	identity,
	...params
}: { identity: Identity } & CreateActiveUserTransactionParams): Promise<void> => {
	const transaction = await createActiveUserTransactionApi({ identity, ...params });

	upsertForIdentity({ identity, transaction });
};

export const updateActiveUserTransaction = async ({
	identity,
	outcomeReportedByCaller = false,
	...params
}: {
	identity: Identity;
	// The caller reports this write's outcome itself, so no later load has to.
	outcomeReportedByCaller?: boolean;
} & UpdateActiveUserTransactionParams): Promise<void> => {
	const principal = identity.getPrincipal();
	const terminal =
		!outcomeReportedByCaller &&
		nonNullish(params.status) &&
		isTerminalActiveUserTransactionStatus(params.status);

	// Before the write, which can commit after this tab is gone: the next load in this browser then
	// reports the outcome instead of taking the row as settled elsewhere. Recorded for the identity
	// that sends it, which the store may no longer hold after a sign-out or an account switch.
	if (terminal) {
		activeUserTransactionsStore.markTerminalWriteSent({ principal, id: params.id });
	}

	let transaction: ActiveUserTransaction;

	try {
		transaction = await updateActiveUserTransactionApi({ identity, ...params });
	} catch (err: unknown) {
		// The canister refused the write, so it never committed: a marker left behind would make a
		// later load report the row once someone else settles it. A transport failure keeps it.
		if (terminal && isActiveUserTransactionError(err)) {
			activeUserTransactionsStore.clearTerminalWriteSent({ principal, id: params.id });
		}

		throw err;
	}

	upsertForIdentity({ identity, transaction });
};

export const deleteActiveUserTransaction = async ({
	identity,
	id
}: {
	identity: Identity;
	id: UpdateActiveUserTransactionParams['id'];
}): Promise<void> => {
	await deleteActiveUserTransactionApi({ identity, id });

	activeUserTransactionsStore.remove({ id });
};

/**
 * Marks every row in the store seen: at once in this browser, and in the backend, up to its latest
 * load, for the user's other devices. Best-effort, like the load: a failed write leaves the mark in
 * this browser, and the next call writes it again.
 */
export const markActiveUserTransactionsSeen = async ({
	identity
}: {
	identity: NullishIdentity;
}): Promise<void> => {
	activeUserTransactionsStore.markAllSeen();

	const state = get(activeUserTransactionsStore);

	if (isNullish(identity) || isNullish(state)) {
		return;
	}

	// Up to the latest load, not the newest row: a row written here since says nothing about one
	// another device created in between, which this list never had.
	const upToNs = state.loadedUpToNs;

	if (upToNs <= state.seenUpToNs) {
		return;
	}

	try {
		const seenUpToNs = await markActiveUserTransactionsSeenApi({ identity, upToNs });

		if (activeUserTransactionsStore.holds(identity.getPrincipal())) {
			activeUserTransactionsStore.setSeenUpTo({ seenUpToNs });
		}
	} catch (err: unknown) {
		consoleError(err);
	}
};

// Reads one of the caller's rows from the backend into the store, for a caller whose copy may be
// stale: a write whose response was lost, or one made from another tab, never reached it. Returns
// the row, or `undefined` once it is gone. Certified, since the caller acts on the answer (the
// Liquidium poller deletes on it): a lagging or misbehaving replica must not be able to hand back
// an older copy.
export const reloadActiveUserTransaction = async ({
	identity,
	id
}: {
	identity: Identity;
	id: UpdateActiveUserTransactionParams['id'];
}): Promise<ActiveUserTransaction | undefined> => {
	const { transactions } = await getActiveUserTransactions({ identity, certified: true });
	const transaction = transactions.find((tx) => tx.id === id);

	if (nonNullish(transaction)) {
		upsertForIdentity({ identity, transaction });
	}

	return transaction;
};

/**
 * Writes a poller's update, if it changes anything. A failed write is reported and swallowed, so
 * that the row stays as it was for the next poll; the result says whether the update was written,
 * for a poller whose own state must outlive a failed write.
 */
export const applyActiveUserTransactionPollUpdate = async ({
	identity,
	tx,
	update
}: {
	identity: Identity;
	tx: ActiveUserTransaction;
	update?: ActiveUserTransactionPollUpdate;
}): Promise<boolean> => {
	if (isNullish(update) || !hasActiveUserTransactionPollUpdateChanges(update)) {
		return false;
	}

	try {
		await updateActiveUserTransaction({
			identity,
			id: tx.id,
			...update
		});

		return true;
	} catch (err: unknown) {
		consoleError(err);

		return false;
	}
};
