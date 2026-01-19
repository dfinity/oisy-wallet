import { browser } from '$app/environment';
import type { SetIdbNftsParams } from '$lib/types/idb-nfts';
import { isNullish } from '@dfinity/utils';
import type { Principal } from '@icp-sdk/core/principal';
import { createStore, get, set as idbSet, type UseStore } from 'idb-keyval';

// There is no IndexedDB in SSG. Since this initialization occurs at the module's root, SvelteKit would encounter an error during the dapp bundling process, specifically a "ReferenceError [Error]: indexedDB is not defined". Therefore, the object for bundling on NodeJS side.
const idbNftsStore = (key: string): UseStore =>
	browser ? createStore(`oisy-${key}-nfts`, `${key}-nfts`) : ({} as unknown as UseStore);

const idbAllNftsStore = idbNftsStore('all');

export const setIdbNftsStore = async ({
	identity,
	nfts,
	idbNftsStore
}: SetIdbNftsParams & {
	idbNftsStore: UseStore;
}) => {
	if (isNullish(identity)) {
		return;
	}

	await idbSet(identity.getPrincipal().toText(), nfts, idbNftsStore);
};

export const setIdbAllNfts = (params: SetIdbNftsParams): Promise<void> =>
	setIdbNftsStore({ ...params, idbNftsStore: idbAllNftsStore });

export const getIdbAllNfts = (
	principal: Principal
): Promise<SetIdbNftsParams['nfts'] | undefined> => get(principal.toText(), idbAllNftsStore);
