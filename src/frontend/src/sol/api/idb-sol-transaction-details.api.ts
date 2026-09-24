import { SOLANA_TRANSACTION_DETAILS_CACHE_SIZE } from '$sol/constants/sol.constants';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SolRpcTransaction, SolSignature } from '$sol/types/sol-transaction';
import { isNullish } from '@dfinity/utils';
import { clear, createStore, delMany, get, keys, set, type UseStore } from 'idb-keyval';

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
let store: UseStore | undefined;

// Opened on first use, never as the module loads.
//
// This module is reached from `solana.api.ts`, which the worker bundle pulls in, so a module-scope
// open ran in every realm the app starts, on every page load — including the landing page, where
// there is no session and nothing to cache. `idb-keyval` opens lazily and closes nothing, so this
// was the only `oisy-` database that existed, and was held open, before sign-in.
//
// That is what broke sign-out. `signOut` deletes every `oisy-` database and, after the reload,
// `displayAndCleanLogoutMsg` deletes them again; a delete cannot proceed against an open
// connection. Every other store had none, because nothing had used it yet, so every other delete
// succeeded. This one was already open on the fresh page, so its delete was blocked, the rejection
// was swallowed by the `Promise.allSettled` in `deleteIdbAllOisyRelated`, and the pending delete
// then stalled every later `open()` of it — which is what left the details of an ended session
// behind, stopped the wallet reading them, and hung the next sign-out.
const openIdb = (): UseStore | undefined => {
	// The dapp is pre-rendered without IndexedDB.
	if (typeof indexedDB === 'undefined') {
		return undefined;
	}

	store ??= createStore('oisy-sol-transaction-details', 'details');

	return store;
};

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
		return await get<SolRpcTransaction>(detailKey({ network, signature, slot }), current);
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
		await set(
			detailKey({
				network,
				signature: transaction.signature,
				slot: transaction.slot
			}),
			transaction,
			current
		);

		await trimNetwork({ network, store: current });
	} catch (_err: unknown) {
		// Nothing to recover: the detail is already loaded, and the next load fetches it again.
	}
};

/**
 * Empties the cache.
 *
 * A realm still running when this is called can write once more before the page reloads. Sign-out
 * deletes the database outright, and deletes it again on the page that follows, so anything left in
 * that window does not reach the next session.
 */
export const clearIdbSolTransactionDetails = async () => {
	const current = openIdb();

	if (isNullish(current)) {
		return;
	}

	await clear(current);
};
