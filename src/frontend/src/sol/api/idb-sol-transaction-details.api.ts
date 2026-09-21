import { SOLANA_TRANSACTION_DETAILS_CACHE_SIZE } from '$sol/constants/sol.constants';
import type { SolAddress } from '$sol/types/address';
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
// `idb-keyval`'s `createStore` opens nothing by itself: it calls `indexedDB.open` on first use. So
// no other `oisy-` database exists before sign-in, and every delete at sign-out succeeds. This
// module used to open at module scope, and read from it there, so it was the one
// database that existed, and was held open, on every page load including the landing page. A delete
// cannot proceed against an open connection, so its delete was blocked, the rejection was swallowed
// by the `Promise.allSettled` in `deleteIdbAllOisyRelated`, and the pending delete then stalled
// every later `open()` of it.
const openIdb = (): UseStore | undefined => {
	// The dapp is pre-rendered without IndexedDB.
	if (typeof indexedDB === 'undefined') {
		return undefined;
	}

	store ??= createStore('oisy-sol-transaction-details', 'details');

	return store;
};

// Kept per wallet, as every other cache is kept per principal.
//
// A finalized transaction is the same for everyone, so the entries could be shared - but nothing in
// a shared key says who wrote it, so a leftover entry could not be told apart at sign-out and
// revealed which transactions the previous user's wallet had looked at. The wallet address scopes it
// exactly as a principal does, and is what these call sites already hold.
//
// The slot is zero-padded to the 20 digits of a u64, so that the keys of one wallet and network sort
// by slot, which is what lets trimming order the entries by reading keys alone.
const detailKey = ({
	address,
	network,
	signature,
	slot
}: {
	address: SolAddress;
	network: SolanaNetworkType;
	signature: SolSignature['signature'];
	slot: SolSignature['slot'];
}): string => `${address}#${network}#${slot.toString().padStart(20, '0')}#${signature}`;

const walletPrefix = ({
	address,
	network
}: {
	address: SolAddress;
	network: SolanaNetworkType;
}): string => `${address}#${network}#`;

/**
 * A cache read must never fail a load: without it the caller asks the RPC, which is what it did
 * before this cache existed.
 */
export const getIdbSolTransactionDetail = async ({
	address,
	network,
	signature: { signature, slot }
}: {
	address: SolAddress;
	network: SolanaNetworkType;
	signature: Pick<SolSignature, 'signature' | 'slot'>;
}): Promise<SolRpcTransaction | undefined> => {
	const current = openIdb();

	if (isNullish(current)) {
		return undefined;
	}

	try {
		return await get<SolRpcTransaction>(detailKey({ address, network, signature, slot }), current);
	} catch (_err: unknown) {
		return undefined;
	}
};

// Everything below the newest `SOLANA_TRANSACTION_DETAILS_CACHE_SIZE` slots of the wallet on that
// network is dropped. The keys alone say which: an entry has no other part that could be left
// behind.
const trimWallet = async ({
	address,
	network,
	store
}: {
	address: SolAddress;
	network: SolanaNetworkType;
	store: UseStore;
}) => {
	const prefix = walletPrefix({ address, network });

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
	address,
	network,
	transaction
}: {
	address: SolAddress;
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
				address,
				network,
				signature: transaction.signature,
				slot: transaction.slot
			}),
			transaction,
			current
		);

		await trimWallet({ address, network, store: current });
	} catch (_err: unknown) {
		// Nothing to recover: the detail is already loaded, and the next load fetches it again.
	}
};

/**
 * Empties the cache, every wallet in it.
 *
 * Sign-out clears it and then deletes the database, and the page that follows deletes it again, as
 * it does for every other `oisy-` database.
 */
export const clearIdbSolTransactionDetails = async () => {
	const current = openIdb();

	if (isNullish(current)) {
		return;
	}

	await clear(current);
};
