import { browser } from '$app/environment';
import { IDB_ADDRESS_STORE, IDB_ETH_ADDRESS_STORE } from '$lib/constants/idb.constants';
import type { IdbAddress, IdbParams } from '$lib/types/idb';
import type { Principal } from '@dfinity/principal';
import { isNullish } from '@dfinity/utils';
import { createStore, del, get, set, update, type UseStore } from 'idb-keyval';

// There is no IndexedDB in SSG. Since this initialization occurs at the module's root, SvelteKit would encounter an error during the dapp bundling process, specifically a "ReferenceError [Error]: indexedDB is not defined". Therefore, the object for bundling on NodeJS side.
const oisyAddressesStore = (storeName: string) =>
	browser ? createStore(IDB_ADDRESS_STORE, storeName) : ({} as unknown as UseStore);

const setIdbAddress = ({
	address,
	principal,
	store
}: { address: IdbAddress } & IdbParams): Promise<void> => set(principal.toText(), address, store);

const updateIdbAddressLastUsage = ({ principal, store }: IdbParams): Promise<void> =>
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
		store
	);

const getIdbAddress = ({ principal, store }: IdbParams): Promise<IdbAddress | undefined> =>
	get(principal.toText(), store);

const deleteIdbAddress = ({ principal, store }: IdbParams): Promise<void> =>
	del(principal.toText(), store);

const oisyEthAddressesStore = oisyAddressesStore(IDB_ETH_ADDRESS_STORE);

export const setIdbEthAddress = ({
	address,
	principal
}: {
	principal: Principal;
	address: IdbAddress;
}): Promise<void> => setIdbAddress({ address, principal, store: oisyEthAddressesStore });

export const updateIdbEthAddressLastUsage = (principal: Principal): Promise<void> =>
	updateIdbAddressLastUsage({ principal, store: oisyEthAddressesStore });

export const getIdbEthAddress = (principal: Principal): Promise<IdbAddress | undefined> =>
	getIdbAddress({ principal, store: oisyEthAddressesStore });

export const deleteIdbEthAddress = (principal: Principal): Promise<void> =>
	deleteIdbAddress({ principal, store: oisyEthAddressesStore });
