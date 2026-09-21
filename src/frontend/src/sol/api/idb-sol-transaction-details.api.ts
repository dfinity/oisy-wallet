import { withDeadline } from '$lib/utils/timeout.utils';
import {
	SOLANA_DETAILS_IDB_DEADLINE_MILLIS,
	SOLANA_TRANSACTION_DETAILS_CACHE_SIZE
} from '$sol/constants/sol.constants';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SolRpcTransaction, SolSignature } from '$sol/types/sol-transaction';
import { isNullish } from '@dfinity/utils';
import {
	clear,
	createStore,
	delMany,
	get,
	keys,
	promisifyRequest,
	type UseStore
} from 'idb-keyval';

/**
 * The details of a finalized Solana transaction, kept per network and signature.
 *
 * A finalized transaction never changes, so a detail fetched once can serve every later derivation of
 * it: the worker's first page after a reload, whose own record of what it holds starts empty, and a
 * pager that derives a held record again for a token that does not hold it yet.
 *
 * Everything lives in one object store, so that each change is a single IndexedDB transaction: an
 * entry is written or not, never half. The slot is part of the key, which lets trimming order the
 * entries by reading their keys alone.
 */
const EPOCH_KEY = 'epoch';

interface Idb {
	store: UseStore;
	// The session this realm writes for, read when the realm loads the module. Clearing the store
	// removes it, so the realms of a session that ended (the network worker as much as the main
	// thread) write nothing after sign-out, whether or not they were waiting on a fetch at the time.
	epoch: Promise<string | undefined>;
}

// A store that missed its deadline once has stopped answering, and every operation queued behind it
// waits the same way. Paying the deadline per read would leave a network's history — and so its
// balances — crawling for the life of the page, so the first miss stands the cache down and later
// calls answer as a miss immediately.
let disabled = false;

const withIdbDeadline = async <T>({
	operation,
	fallback
}: {
	operation: Promise<T>;
	fallback: T;
}): Promise<T> => {
	const timedOut = Symbol('timedOut');

	const result = await withDeadline<T | typeof timedOut>({
		operation: operation.then((value) => value),
		fallback: timedOut,
		milliseconds: SOLANA_DETAILS_IDB_DEADLINE_MILLIS
	});

	if (result === timedOut) {
		disabled = true;

		return fallback;
	}

	return result;
};

let idb: Idb | undefined;

// An epoch is created by the first realm of a session that finds none, in the same transaction that
// reads it, so that two realms starting together agree on one.
const readEpoch = async (store: UseStore): Promise<string | undefined> => {
	try {
		return await store('readwrite', (objectStore) => {
			const request = objectStore.get(EPOCH_KEY);

			// Chained by hand rather than with promises, as `idb-keyval` does for `update`: a promise
			// continuation can run after the transaction has closed.
			return new Promise<string>((resolve, reject) => {
				request.onsuccess = () => {
					if (typeof request.result === 'string') {
						resolve(request.result);

						return;
					}

					const epoch = crypto.randomUUID();

					objectStore.put(epoch, EPOCH_KEY);

					resolve(epoch);
				};

				request.onerror = () => reject(request.error);
			});
		});
	} catch (_err: unknown) {
		// Without an epoch nothing is written, which is where the caller was before this cache existed.
		return undefined;
	}
};

const openIdb = (): Idb | undefined => {
	// The dapp is pre-rendered without IndexedDB.
	if (typeof indexedDB === 'undefined') {
		return undefined;
	}

	// Stood down after a deadline miss: every caller answers as it did before this cache existed.
	if (disabled) {
		return undefined;
	}

	if (isNullish(idb)) {
		const store = createStore('oisy-sol-transaction-details', 'details');

		idb = { store, epoch: readEpoch(store) };
	}

	return idb;
};

// Opened as the module loads rather than on first use, so that a realm takes the epoch of the session
// it started in: a worker that fetched nothing yet when the user signed out must not adopt the next
// session's epoch on its first write.
//
// The cost is that every realm the app starts opens this database — the main thread plus each
// wallet, auth and exchange worker, since the worker bundle reaches this module through
// `solana.api.ts` — and `idb-keyval`'s `createStore` never closes its connection. Realms racing to
// create the database for the first time can leave an `open` answering with no event at all, which
// is what `withIdbDeadline` and `disableIdb` below exist to survive.
openIdb();

// The slot is zero-padded to the 20 digits of a u64, so that the keys of a network sort by slot.
const detailKey = ({
	network,
	signature,
	slot
}: {
	network: SolanaNetworkType;
	signature: SolSignature['signature'];
	slot: SolSignature['slot'];
}): string => `${network}#${slot.toString().padStart(20, '0')}#${signature}`;

const networkPrefix = (network: SolanaNetworkType): string => `${network}#`;

/**
 * A cache read must never fail a load: without it the caller asks the RPC, which is what it did
 * before this cache existed.
 */
export const getIdbSolTransactionDetail = async ({
	network,
	signature: { signature, slot }
}: {
	network: SolanaNetworkType;
	signature: Pick<SolSignature, 'signature' | 'slot'>;
}): Promise<SolRpcTransaction | undefined> => {
	const current = openIdb();

	if (isNullish(current)) {
		return undefined;
	}

	try {
		return await withIdbDeadline({
			operation: get<SolRpcTransaction>(detailKey({ network, signature, slot }), current.store),
			fallback: undefined
		});
	} catch (_err: unknown) {
		return undefined;
	}
};

// Everything below the newest `SOLANA_TRANSACTION_DETAILS_CACHE_SIZE` slots of the network is
// dropped. The keys alone say which: an entry has no other part that could be left behind.
const trimNetwork = async ({ network, store }: { network: SolanaNetworkType; store: UseStore }) => {
	const prefix = networkPrefix(network);

	const networkKeys = (await keys<string>(store)).filter((key) => key.startsWith(prefix)).sort();

	const staleKeys = networkKeys.slice(
		0,
		Math.max(0, networkKeys.length - SOLANA_TRANSACTION_DETAILS_CACHE_SIZE)
	);

	if (staleKeys.length > 0) {
		await delMany(staleKeys, store);
	}
};

/**
 * Keeps the details of a finalized transaction. Nothing else may be kept: a transaction that is not
 * finalized yet can still be dropped by the network, and its details would then never be asked for
 * again.
 *
 * A cache write must never fail a load either, so a browser that refuses to store (private browsing,
 * a full quota) leaves the loaded transaction exactly as it is.
 */
export const setIdbSolTransactionDetail = async ({
	network,
	transaction
}: {
	network: SolanaNetworkType;
	transaction: SolRpcTransaction;
}): Promise<void> => {
	const current = openIdb();

	if (isNullish(current) || transaction.confirmationStatus !== 'finalized') {
		return;
	}

	try {
		const epoch = await withIdbDeadline({ operation: current.epoch, fallback: undefined });

		if (isNullish(epoch)) {
			return;
		}

		const key = detailKey({
			network,
			signature: transaction.signature,
			slot: transaction.slot
		});

		// The epoch is checked in the transaction that writes, so a clear cannot slip in between.
		const write = current.store('readwrite', (objectStore) => {
			const request = objectStore.get(EPOCH_KEY);

			return new Promise<void>((resolve, reject) => {
				request.onsuccess = () => {
					if (request.result === epoch) {
						objectStore.put(transaction, key);
					}

					resolve(promisifyRequest(objectStore.transaction));
				};

				request.onerror = () => reject(request.error);
			});
		});

		await withIdbDeadline({ operation: write, fallback: undefined });

		await withIdbDeadline({
			operation: trimNetwork({ network, store: current.store }),
			fallback: undefined
		});
	} catch (_err: unknown) {
		// Nothing to recover: the detail is already loaded, and the next load fetches it again.
	}
};

/**
 * Empties the cache, epoch included. This realm keeps the epoch it started with, and so writes
 * nothing more: sign-out reloads the page, and the realms of the next session start a new epoch.
 */
export const clearIdbSolTransactionDetails = async () => {
	const current = openIdb();

	if (isNullish(current)) {
		return;
	}

	await withIdbDeadline({ operation: clear(current.store), fallback: undefined });
};
