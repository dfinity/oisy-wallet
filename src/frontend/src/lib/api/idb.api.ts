import { browser } from '$app/environment';
import { IDB_ADDRESS_STORE, IDB_ETH_ADDRESS_STORE } from '$lib/constants/idb.constants';
import type { IdbAddress } from '$lib/types/idb';
import type { Principal } from '@dfinity/principal';
import { isNullish } from '@dfinity/utils';
import { createStore, del, get, set, update, type UseStore } from 'idb-keyval';

// There is no IndexedDB in SSG. Since this initialization occurs at the module's root, SvelteKit would encounter an error during the dapp bundling process, specifically a "ReferenceError [Error]: indexedDB is not defined". Therefore, the object for bundling on NodeJS side.
const oisyAddressesStore = (storeName: string) =>
	browser ? createStore(IDB_ADDRESS_STORE, storeName) : ({} as unknown as UseStore);

const oisyEthAddressesStore = oisyAddressesStore(IDB_ETH_ADDRESS_STORE);

const setIdbAddress = ({
	address,
	principal,
	store
}: {
	address: IdbAddress;
	principal: Principal;
	store: UseStore;
}): Promise<void> => set(principal.toText(), address, store);

export const setIdbEthAddress = ({
	address,
	principal
}: {
	principal: Principal;
	address: IdbAddress;
}): Promise<void> => setIdbAddress({ address, principal, store: oisyEthAddressesStore });

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
		oisyEthAddressesStore
	);

export const getIdbEthAddress = (principal: Principal): Promise<IdbAddress | undefined> =>
	get(principal.toText(), oisyEthAddressesStore);

export const deleteIdbEthAddress = (principal: Principal): Promise<void> =>
	del(principal.toText(), oisyEthAddressesStore);
