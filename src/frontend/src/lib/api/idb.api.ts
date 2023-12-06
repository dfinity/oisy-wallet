import type { IdbEthAddress } from '$lib/types/idb';
import type { Principal } from '@dfinity/principal';
import { createStore, get, set } from 'idb-keyval';

const oisyEthAddressesStore = createStore('oisy-eth-addresses', 'eth-addresses');

export const setIdbEthAddress = ({
	address,
	principal
}: {
	principal: Principal;
	address: IdbEthAddress;
}): Promise<void> => set(principal.toText(), address, oisyEthAddressesStore);

export const getIdbEthAddress = (principal: Principal): Promise<IdbEthAddress | undefined> =>
	get(principal.toText(), oisyEthAddressesStore);
