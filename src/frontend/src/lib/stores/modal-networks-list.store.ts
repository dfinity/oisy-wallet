import type { Network, NetworkId } from '$lib/types/network';
import { nonNullish } from '@dfinity/utils';
import { derived, writable, type Readable } from 'svelte/store';

export interface ModalNetworksListData {
	networks: Network[];
	allowedNetworkIds?: NetworkId[];
}

export const initModalNetworksListContext = (
	initialData: ModalNetworksListData
): ModalNetworksListContext => {
	const data = writable<ModalNetworksListData>({
		networks: initialData.networks,
		allowedNetworkIds: initialData?.allowedNetworkIds ?? []
	});

	const { update } = data;

	const filteredNetworks = derived(data, ({ networks, allowedNetworkIds }) =>
		nonNullish(allowedNetworkIds) && allowedNetworkIds.length > 0
			? networks.filter((network) => allowedNetworkIds.includes(network.id))
			: networks
	);

	return {
		filteredNetworks,
		setNetworks: (networks: Network[]) => update((state) => ({ ...state, networks })),
		setAllowedNetworkIds: (ids: NetworkId[]) =>
			update((state) => ({ ...state, allowedNetworkIds: ids })),
		resetAllowedNetworkIds: () => update((state) => ({ ...state, allowedNetworkIds: [] }))
	};
};

export interface ModalNetworksListContext {
	filteredNetworks: Readable<Network[]>;
	setNetworks: (networks: Network[]) => void;
	setAllowedNetworkIds: (ids: NetworkId[]) => void;
	resetAllowedNetworkIds: () => void;
}

export const MODAL_NETWORKS_LIST_CONTEXT_KEY = Symbol('modal-networks-list');
