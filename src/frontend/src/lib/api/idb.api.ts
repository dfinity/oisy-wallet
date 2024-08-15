import { browser } from '$app/environment';
import { ETHEREUM_NETWORK_SYMBOL } from '$env/networks.env';
import type { IdbEthAddress } from '$lib/types/idb';
import type { Principal } from '@dfinity/principal';
import { isNullish } from '@dfinity/utils';
import { createStore, del, get, set, update, type UseStore } from 'idb-keyval';

// There is no IndexedDB in SSG. Since this initialization occurs at the module's root, SvelteKit would encounter an error during the dapp bundling process, specifically a "ReferenceError [Error]: indexedDB is not defined". Therefore, the object for bundling on NodeJS side.
export const idbAddressesStore = (key: string): UseStore =>
	browser ? createStore(`oisy-${key}-addresses`, `${key}-addresses`) : ({} as unknown as UseStore);

const idbEthAddressesStore = idbAddressesStore(ETHEREUM_NETWORK_SYMBOL.toLowerCase());

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
