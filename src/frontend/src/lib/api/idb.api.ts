import { browser } from '$app/environment';
import type { IdbEthAddress } from '$lib/types/idb';
import type { Principal } from '@dfinity/principal';
import { createStore, del, get, set, type UseStore } from 'idb-keyval';

// There is no IndexedDB in SSG. Since this initialization occurs at the module's root, SvelteKit would encounter an error during the dapp bundling process, specifically a "ReferenceError [Error]: indexedDB is not defined". Therefore, the object for bundling on NodeJS side.
const oisyEthAddressesStore = browser
	? createStore('oisy-eth-addresses', 'eth-addresses')
	: ({} as unknown as UseStore);

export const setIdbEthAddress = ({
	address,
	principal
}: {
	principal: Principal;
	address: IdbEthAddress;
}): Promise<void> => set(principal.toText(), address, oisyEthAddressesStore);

export const getIdbEthAddress = (principal: Principal): Promise<IdbEthAddress | undefined> =>
	get(principal.toText(), oisyEthAddressesStore);

export const deleteIdbEthAddress = (principal: Principal): Promise<void> =>
	del(principal.toText(), oisyEthAddressesStore);
