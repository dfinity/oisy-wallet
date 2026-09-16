import {
	SOLANA_TRANSACTION_DETAILS_CACHE_SIZE,
	SOLANA_TRANSACTION_DETAILS_CACHE_SLACK
} from '$sol/constants/sol.constants';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SolRpcTransaction, SolSignature } from '$sol/types/sol-transaction';
import { isNullish } from '@dfinity/utils';
import { clear, createStore, delMany, entries, get, keys, set, type UseStore } from 'idb-keyval';

/**
 * The details of a finalized Solana transaction, kept per network and signature.
 *
 * A finalized transaction never changes, so what one realm fetched serves the other: the network
 * worker and the lists of the main thread each derive their records from the same detail, and a
 * reload reads it back rather than asking the RPC for it again.
 *
 * The slots live in their own store so that trimming reads only the slots, never the details.
 */
let stores: { details: UseStore; slots: UseStore } | undefined;

// The writes nobody is waiting for, so that clearing the cache at sign-out can.
const pendingWrites = new Set<Promise<void>>();

// Opened on first use rather than at module load: the dapp is pre-rendered without IndexedDB, and
// this module is reached from the worker realm as well.
const idbStores = (): { details: UseStore; slots: UseStore } | undefined => {
	if (typeof indexedDB === 'undefined') {
		return undefined;
	}

	stores ??= {
		details: createStore('oisy-sol-transaction-details', 'details'),
		slots: createStore('oisy-sol-transaction-detail-slots', 'slots')
	};

	return stores;
};

const detailKey = ({
	network,
	signature
}: {
	network: SolanaNetworkType;
	signature: SolSignature['signature'];
}): string => `${network}#${signature}`;

const networkPrefix = (network: SolanaNetworkType): string => `${network}#`;

/**
 * A cache read must never fail a load: without it the caller asks the RPC, which is what it did
 * before this cache existed.
 */
export const getIdbSolTransactionDetail = async ({
	network,
	signature
}: {
	network: SolanaNetworkType;
	signature: SolSignature['signature'];
}): Promise<SolRpcTransaction | undefined> => {
	const idb = idbStores();

	if (isNullish(idb)) {
		return undefined;
	}

	try {
		return await get<SolRpcTransaction>(detailKey({ network, signature }), idb.details);
	} catch (_err: unknown) {
		return undefined;
	}
};

// Everything above the newest `SOLANA_TRANSACTION_DETAILS_CACHE_SIZE` slots of the network is
// dropped: the history a user scrolls back to is bounded, and an unbounded cache would grow with
// every transaction ever looked at.
const trimNetwork = async ({
	network,
	idb
}: {
	network: SolanaNetworkType;
	idb: { details: UseStore; slots: UseStore };
}) => {
	const prefix = networkPrefix(network);

	const storedKeys = (await keys<string>(idb.slots)).filter((key) => key.startsWith(prefix));

	if (
		storedKeys.length <=
		SOLANA_TRANSACTION_DETAILS_CACHE_SIZE + SOLANA_TRANSACTION_DETAILS_CACHE_SLACK
	) {
		return;
	}

	const storedSlots = (await entries<string, SolSignature['slot']>(idb.slots)).filter(([key]) =>
		key.startsWith(prefix)
	);

	const staleKeys = storedSlots
		.sort(([, a], [, b]) => (a === b ? 0 : a > b ? -1 : 1))
		.slice(SOLANA_TRANSACTION_DETAILS_CACHE_SIZE)
		.map(([key]) => key);

	await delMany(staleKeys, idb.details);
	await delMany(staleKeys, idb.slots);
};

/**
 * Keeps the details of a finalized transaction. Nothing else may be kept: a transaction that is not
 * finalized yet can still be dropped by the network, and its details would then never be asked for
 * again.
 */
export const setIdbSolTransactionDetail = ({
	network,
	transaction
}: {
	network: SolanaNetworkType;
	transaction: SolRpcTransaction;
}): Promise<void> => {
	const idb = idbStores();

	if (isNullish(idb) || transaction.confirmationStatus !== 'finalized') {
		return Promise.resolve();
	}

	const write = writeDetail({ network, transaction, idb });

	pendingWrites.add(write);

	return write.finally(() => pendingWrites.delete(write));
};

const writeDetail = async ({
	network,
	transaction,
	idb
}: {
	network: SolanaNetworkType;
	transaction: SolRpcTransaction;
	idb: { details: UseStore; slots: UseStore };
}) => {
	const key = detailKey({ network, signature: transaction.signature });

	// A cache write must never fail a load either, so a browser that refuses to store (private
	// browsing, a full quota) leaves the loaded transaction exactly as it is.
	try {
		// The slot goes first: trimming reads the slots, so a detail written without one would never
		// be dropped, while a slot left without its detail is only an entry that trimming deletes.
		await set(key, transaction.slot, idb.slots);
		await set(key, transaction, idb.details);

		await trimNetwork({ network, idb });
	} catch (_err: unknown) {
		// Nothing to recover: the detail is already loaded, and the next load fetches it again.
	}
};

export const clearIdbSolTransactionDetails = async () => {
	const idb = idbStores();

	// Callers do not wait for a write, so one already on its way would land after the clear and leave
	// the transactions of the session that is ending behind.
	await Promise.allSettled([...pendingWrites]);

	if (isNullish(idb)) {
		return;
	}

	await clear(idb.details);
	await clear(idb.slots);
};
