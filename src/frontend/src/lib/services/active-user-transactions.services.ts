import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import {
	createActiveUserTransaction as createActiveUserTransactionApi,
	deleteActiveUserTransaction as deleteActiveUserTransactionApi,
	getActiveUserTransactions,
	updateActiveUserTransaction as updateActiveUserTransactionApi
} from '$lib/api/backend.api';
import type {
	CreateActiveUserTransactionParams,
	UpdateActiveUserTransactionParams
} from '$lib/types/api';
import type { NullishIdentity } from '$lib/types/identity';
import { isNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';

/**
 * Loads the caller's active user transactions (Pending, Executing, Succeeded,
 * Failed). Returns `undefined` when the identity is not yet available or the
 * backend call fails — callers should treat missing data as "not yet known"
 * and may surface their own UI error.
 */
export const loadActiveUserTransactions = async ({
	identity
}: {
	identity: NullishIdentity;
}): Promise<ActiveUserTransaction[] | undefined> => {
	if (isNullish(identity)) {
		return;
	}

	try {
		return await getActiveUserTransactions({ identity });
	} catch (_: unknown) {
		// Polling is best-effort: the FE will retry on the next tick.
	}
};

export const createActiveUserTransaction = ({
	identity,
	...params
}: { identity: Identity } & CreateActiveUserTransactionParams): Promise<ActiveUserTransaction> =>
	createActiveUserTransactionApi({ identity, ...params });

export const updateActiveUserTransaction = ({
	identity,
	...params
}: { identity: Identity } & UpdateActiveUserTransactionParams): Promise<ActiveUserTransaction> =>
	updateActiveUserTransactionApi({ identity, ...params });

export const deleteActiveUserTransaction = ({
	identity,
	id
}: {
	identity: Identity;
	id: string;
}): Promise<void> => deleteActiveUserTransactionApi({ identity, id });
