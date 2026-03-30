import { browser } from '$app/environment';
import { SUPPORTED_NETWORKS } from '$env/networks/networks.env';
import type { SerializableNft, SetIdbNftsParams } from '$lib/types/idb-nfts';
import type { Nft } from '$lib/types/nft';
import { parseNetworkId } from '$lib/validation/network.validation';
import { parseTokenId } from '$lib/validation/token.validation';
import { isNullish } from '@dfinity/utils';
import type { Principal } from '@icp-sdk/core/principal';
import { clear, createStore, get, set as idbSet, type UseStore } from 'idb-keyval';

// There is no IndexedDB in SSG. Since this initialization occurs at the module's root, SvelteKit would encounter an error during the dapp bundling process, specifically a "ReferenceError [Error]: indexedDB is not defined". Therefore, the object for bundling on NodeJS side.
const createIdbNftsStore = (): UseStore =>
	browser ? createStore('oisy-nfts', 'nfts') : ({} as unknown as UseStore);

const idbNftsStore = createIdbNftsStore();

/**
 * Symbols cannot be stored via the structured clone algorithm used by IndexedDB.
 * We convert TokenId and NetworkId symbols to their string descriptions before storage.
 */
const serializeNft = ({ collection, ...rest }: Nft): SerializableNft => ({
	...rest,
	collection: {
		...collection,
		id: `${collection.id.description}`,
		network: {
			...collection.network,
			id: `${collection.network.id.description}`
		}
	}
});

/**
 * Restores Symbol-based IDs after reading from IndexedDB.
 * Looks up the singleton Network instance to preserve Symbol identity for === comparisons.
 * Falls back to creating new symbols if the network is not found (e.g. removed from config).
 */
const deserializeNft = ({ collection, ...rest }: SerializableNft): Nft => {
	const singletonNetwork = SUPPORTED_NETWORKS.find(
		({ id }) => id.description === collection.network.id
	);

	return {
		...rest,
		collection: {
			...collection,
			id: parseTokenId(collection.id),
			network: singletonNetwork ?? {
				...collection.network,
				id: parseNetworkId(collection.network.id)
			}
		}
	};
};

const setIdbNfts = async ({
	identity,
	nfts,
	store
}: SetIdbNftsParams & {
	store: UseStore;
}) => {
	if (isNullish(identity)) {
		return;
	}

	await idbSet(identity.getPrincipal().toText(), nfts.map(serializeNft), store);
};

export const setIdbAllNfts = (params: SetIdbNftsParams): Promise<void> =>
	setIdbNfts({ ...params, store: idbNftsStore });

export const getIdbAllNfts = async (principal: Principal): Promise<Nft[] | undefined> => {
	const raw = await get<SerializableNft[]>(principal.toText(), idbNftsStore);
	return raw?.map(deserializeNft);
};

export const clearIdbNfts = (): Promise<void> => clear(idbNftsStore);
