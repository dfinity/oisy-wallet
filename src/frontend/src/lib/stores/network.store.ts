import { getLocalStorageNetworkId, setLocalStorageNetworkId } from '$lib/api/local-storage.api';
import { ETHEREUM_NETWORK_ID, NETWORKS } from '$lib/constants/networks.constants';
import type { NetworkId } from '$lib/types/network';
import { nonNullish } from '@dfinity/utils';
import { writable, type Readable } from 'svelte/store';

export interface NetworkIdStore extends Readable<NetworkId> {
	set: (networkId: NetworkId) => void;
}

const initNetworkIdStore = (): NetworkIdStore => {
	const INITIAL_NETWORK_ID_TEXT = getLocalStorageNetworkId();

	const initNetworkId = () =>
		nonNullish(INITIAL_NETWORK_ID_TEXT)
			? NETWORKS.find(({ id }) => id.description === INITIAL_NETWORK_ID_TEXT)?.id ??
				ETHEREUM_NETWORK_ID
			: ETHEREUM_NETWORK_ID;

	const { subscribe, set } = writable<NetworkId>(initNetworkId());

	return {
		subscribe,

		set: (networkId: NetworkId) => {
			set(networkId);
			setLocalStorageNetworkId(networkId);
		}
	};
};

export const networkIdStore = initNetworkIdStore();
