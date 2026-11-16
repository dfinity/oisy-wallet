import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import {
	createActiveUserTransaction as createActiveUserTransactionApi,
	deleteActiveUserTransaction as deleteActiveUserTransactionApi,
	getActiveUserTransactions,
	markActiveUserTransactionsSeen as markActiveUserTransactionsSeenApi,
	updateActiveUserTransaction as updateActiveUserTransactionApi
} from '$lib/api/backend.api';
import {
	BTC_NEVER_LANDED_CHECK_INTERVAL_MILLIS,
	BTC_NEVER_LANDED_GRACE_MILLIS,
	BTC_NEVER_LANDED_NOT_FOUND_ANSWERS_REQUIRED,
	NANO_SECONDS_IN_MILLISECOND,
	UNBROADCAST_ACTIVE_USER_TRANSACTION_DELETE_ATTEMPTS,
	UNBROADCAST_ACTIVE_USER_TRANSACTION_DELETE_RETRY_DELAY_MILLIS
} from '$lib/constants/app.constants';
import { btcTransactionStatus } from '$lib/rest/blockstream.rest';
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
import { waitForMilliseconds } from '$lib/utils/timeout.utils';
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

		if (activeUserTransactionsStore.holds(identity.getPrincipal())) {
			activeUserTransactionsStore.set({ transactions, since, seenUpToNs });
		}
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
 * Deletes the row of a transaction that was never broadcast: its broadcast was refused outright, or
 * the send stopped before it after the row was written. A delete that keeps failing leaves the row to
 * its poller.
 */
export const deleteUnbroadcastActiveUserTransaction = async ({
	identity,
	id
}: {
	identity: Identity;
	id: UpdateActiveUserTransactionParams['id'];
}): Promise<void> => {
	for (let attempt = 1; attempt <= UNBROADCAST_ACTIVE_USER_TRANSACTION_DELETE_ATTEMPTS; attempt++) {
		try {
			await deleteActiveUserTransaction({ identity, id });

			return;
		} catch (err: unknown) {
			consoleError(err);
		}

		if (attempt < UNBROADCAST_ACTIVE_USER_TRANSACTION_DELETE_ATTEMPTS) {
			await waitForMilliseconds(UNBROADCAST_ACTIVE_USER_TRANSACTION_DELETE_RETRY_DELAY_MILLIS);
		}
	}
};

const BTC_TXID_REGEX = /^[0-9a-f]{64}$/i;

/**
 * Each BTC row's last "is it known" check and its run of "not found" answers. In memory, like the
 * pollers' other counters: a refresh restarts the run, which only delays a verdict.
 */
const btcNeverLandedChecks = new Map<string, { checkedAtMs: number; notFoundAnswers: number }>();

// Test seam — module-level state would otherwise leak between cases.
export const resetBtcNeverLandedChecks = (): void => {
	btcNeverLandedChecks.clear();
};

/**
 * Whether a mainnet BTC row's transaction never reached the network, so its poller can fail the row
 * instead of waiting for it for good. A row can be written before its broadcast, which may then
 * have sent nothing, though its outcome was unclear.
 *
 * Bitcoin cannot prove that nothing was broadcast. The evidence is the network not knowing the
 * txid: neither in Blockstream's mempool nor in a block, `BTC_NEVER_LANDED_NOT_FOUND_ANSWERS_REQUIRED`
 * times in a row, at most once per `BTC_NEVER_LANDED_CHECK_INTERVAL_MILLIS`, once the row has gone
 * `BTC_NEVER_LANDED_GRACE_MILLIS` without a write. A transaction in a mempool is found, so its row
 * keeps waiting however long it takes to confirm. A failed request counts for nothing either way.
 *
 * The grace runs from the row's last write, not its creation: a Liquidium repay renews its row while
 * its broadcast is pending, and that call has no deadline. Once the renewals stop, the backend frees
 * the reservation within the hour too.
 */
export const isBtcTransactionNeverLanded = async ({
	id,
	txid,
	updatedAtNs
}: {
	id: string;
	txid: string;
	updatedAtNs: bigint;
}): Promise<boolean> => {
	const now = Date.now();

	if (
		!BTC_TXID_REGEX.test(txid) ||
		now - Number(updatedAtNs / NANO_SECONDS_IN_MILLISECOND) < BTC_NEVER_LANDED_GRACE_MILLIS
	) {
		return false;
	}

	const previous = btcNeverLandedChecks.get(id);

	if (nonNullish(previous) && now - previous.checkedAtMs < BTC_NEVER_LANDED_CHECK_INTERVAL_MILLIS) {
		return false;
	}

	let notFoundAnswers = previous?.notFoundAnswers ?? 0;

	try {
		const status = await btcTransactionStatus({ txid });

		notFoundAnswers = isNullish(status) ? notFoundAnswers + 1 : 0;
	} catch (_: unknown) {
		// Unknown either way: the run neither grows nor restarts, and the interval still applies.
	}

	if (notFoundAnswers >= BTC_NEVER_LANDED_NOT_FOUND_ANSWERS_REQUIRED) {
		btcNeverLandedChecks.delete(id);

		return true;
	}

	btcNeverLandedChecks.set(id, { checkedAtMs: now, notFoundAnswers });

	return false;
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
