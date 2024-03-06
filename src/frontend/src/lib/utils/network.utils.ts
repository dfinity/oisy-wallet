import { ETHEREUM_NETWORKS_IDS, ICP_NETWORK_ID } from '$icp-eth/constants/networks.constants';
import type { Network, NetworkId } from '$lib/types/network';
import { nonNullish } from '@dfinity/utils';

export const isNetworkICP = ({ id }: Network): boolean => isNetworkIdICP(id);

export const isNetworkIdICP = (id: NetworkId): boolean => ICP_NETWORK_ID === id;

export const isNetworkIdEthereum = (id: NetworkId | undefined): boolean =>
	nonNullish(id) && ETHEREUM_NETWORKS_IDS.includes(id);
