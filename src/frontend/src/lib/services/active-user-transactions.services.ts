import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import {
	createActiveUserTransaction as createActiveUserTransactionApi,
	deleteActiveUserTransaction as deleteActiveUserTransactionApi,
	getActiveUserTransactions,
	markActiveUserTransactionsSeen as markActiveUserTransactionsSeenApi,
	updateActiveUserTransaction as updateActiveUserTransactionApi
} from '$lib/api/backend.api';
import { ZERO } from '$lib/constants/app.constants';
import { activeUserTransactionsStore } from '$lib/stores/active-user-transactions.store';
import type {
	CreateActiveUserTransactionParams,
	UpdateActiveUserTransactionParams
} from '$lib/types/api';
import type { NullishIdentity } from '$lib/types/identity';
import {
	hasActiveUserTransactionPollUpdateChanges,
	type ActiveUserTransactionPollUpdate
} from '$lib/utils/active-user-transactions.utils';
import { consoleError } from '$lib/utils/console.utils';
import { isNullish } from '@dfinity/utils';
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

/**
 * Marks every row in the store seen: at once in this browser, and in the backend for the user's
 * other devices. Best-effort, like the load: a failed write leaves the mark in this browser, and the
 * next call writes it again.
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

	const upToNs = Object.values(state.data).reduce(
		(latest, { updated_at_ns }) => (updated_at_ns > latest ? updated_at_ns : latest),
		ZERO
	);

	if (upToNs <= state.seenUpToNs) {
		return;
	}

	try {
		const seenUpToNs = await markActiveUserTransactionsSeenApi({ identity, upToNs });

		activeUserTransactionsStore.setSeenUpTo({ seenUpToNs });
	} catch (err: unknown) {
		consoleError(err);
	}
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
