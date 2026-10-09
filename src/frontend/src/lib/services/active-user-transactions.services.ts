import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import {
	createActiveUserTransaction as createActiveUserTransactionApi,
	deleteActiveUserTransaction as deleteActiveUserTransactionApi,
	getActiveUserTransactions,
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
		const transactions = await getActiveUserTransactions({ identity });

		activeUserTransactionsStore.set({ transactions, since });
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

export const applyActiveUserTransactionPollUpdate = async ({
	identity,
	tx,
	update
}: {
	identity: Identity;
	tx: ActiveUserTransaction;
	update?: ActiveUserTransactionPollUpdate;
}): Promise<void> => {
	if (isNullish(update) || !hasActiveUserTransactionPollUpdateChanges(update)) {
		return;
	}

	try {
		await updateActiveUserTransaction({
			identity,
			id: tx.id,
			...update
		});
	} catch (err: unknown) {
		consoleError(err);
	}
};
