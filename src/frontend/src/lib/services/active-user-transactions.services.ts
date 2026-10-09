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

export const createActiveUserTransaction = async ({
	identity,
	...params
}: { identity: Identity } & CreateActiveUserTransactionParams): Promise<void> => {
	const transaction = await createActiveUserTransactionApi({ identity, ...params });

	activeUserTransactionsStore.upsert({ transaction });
};

export const updateActiveUserTransaction = async ({
	identity,
	...params
}: { identity: Identity } & UpdateActiveUserTransactionParams): Promise<void> => {
	// Before the write, which can commit after this tab is gone: the next load in this browser then
	// reports the outcome instead of taking the row as settled elsewhere.
	if (nonNullish(params.status) && isTerminalActiveUserTransactionStatus(params.status)) {
		activeUserTransactionsStore.markTerminalWriteSent({ id: params.id });
	}

	const transaction = await updateActiveUserTransactionApi({ identity, ...params });

	activeUserTransactionsStore.upsert({ transaction });
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
