import { browser } from '$app/environment';
import { IDB_ADDRESS_STORE, IDB_ETH_ADDRESS_STORE } from '$lib/constants/idb.constants';
import type { IdbEthAddress } from '$lib/types/idb';
import type { Principal } from '@dfinity/principal';
import { isNullish } from '@dfinity/utils';
import { createStore, del, get, set, update, type UseStore } from 'idb-keyval';

// There is no IndexedDB in SSG. Since this initialization occurs at the module's root, SvelteKit would encounter an error during the dapp bundling process, specifically a "ReferenceError [Error]: indexedDB is not defined". Therefore, the object for bundling on NodeJS side.
const idbAddressesStore = (storeName: string) =>
	browser ? createStore(IDB_ADDRESS_STORE, storeName) : ({} as unknown as UseStore);

const idbEthAddressesStore = idbAddressesStore(IDB_ETH_ADDRESS_STORE);

export const setIdbEthAddress = ({
	address,
	principal
}: {
	principal: Principal;
	address: IdbEthAddress;
}): Promise<void> => set(principal.toText(), address, idbEthAddressesStore);

export const updateIdbEthAddressLastUsage = (principal: Principal): Promise<void> =>
	update(
		principal.toText(),
		(address) => {
			if (isNullish(address)) {
				return undefined;
			}

			return {
				...address,
				lastUsedTimestamp: Date.now()
			};
		},
		idbEthAddressesStore
	);

export const getIdbEthAddress = (principal: Principal): Promise<IdbEthAddress | undefined> =>
	get(principal.toText(), idbEthAddressesStore);

export const deleteIdbEthAddress = (principal: Principal): Promise<void> =>
	del(principal.toText(), idbEthAddressesStore);
