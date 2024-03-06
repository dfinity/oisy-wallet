import { ETHEREUM_NETWORK_ID, ICP_NETWORK_ID } from '$icp-eth/constants/networks.constants';
import type { Network, NetworkId } from '$lib/types/network';

export const isNetworkICP = ({ id }: Network): boolean => isNetworkIdICP(id);

export const isNetworkIdICP = (id: NetworkId): boolean => ICP_NETWORK_ID === id;

export const isNetworkIdEthereum = (id: NetworkId): boolean => ETHEREUM_NETWORK_ID === id;
