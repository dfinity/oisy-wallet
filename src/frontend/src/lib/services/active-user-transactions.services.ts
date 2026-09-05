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
	type ActiveUserTransactionPollUpdate
} from '$lib/utils/active-user-transactions.utils';
import { consoleError } from '$lib/utils/console.utils';
import { isNullish } from '@dfinity/utils';
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

	const principal = identity.getPrincipal();

	activeUserTransactionsStore.init(principal);

	try {
		const transactions = await getActiveUserTransactions({ identity });

		activeUserTransactionsStore.set({ principal, transactions });
	} catch (err: unknown) {
		consoleError(err);
	}
};

export const createActiveUserTransaction = async ({
	identity,
	...params
}: { identity: Identity } & CreateActiveUserTransactionParams): Promise<void> => {
	const principal = identity.getPrincipal();
	const transaction = await createActiveUserTransactionApi({ identity, ...params });

	activeUserTransactionsStore.upsert({ principal, transaction });
};

export const updateActiveUserTransaction = async ({
	identity,
	...params
}: { identity: Identity } & UpdateActiveUserTransactionParams): Promise<void> => {
	const principal = identity.getPrincipal();
	const transaction = await updateActiveUserTransactionApi({ identity, ...params });

	activeUserTransactionsStore.upsert({ principal, transaction });
};

export const deleteActiveUserTransaction = async ({
	identity,
	id
}: {
	identity: Identity;
	id: UpdateActiveUserTransactionParams['id'];
}): Promise<void> => {
	const principal = identity.getPrincipal();

	await deleteActiveUserTransactionApi({ identity, id });

	activeUserTransactionsStore.remove({ principal, id });
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
