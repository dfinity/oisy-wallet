import {
	BITCOIN_NETWORKS_IDS,
	ICP_NETWORK_ID,
	SUPPORTED_ETHEREUM_NETWORKS_IDS
} from '$env/networks.env';
import type { Network, NetworkId } from '$lib/types/network';
import { nonNullish } from '@dfinity/utils';

export const isNetworkICP = ({ id }: Network): boolean => isNetworkIdICP(id);

export const isNetworkIdICP = (id: NetworkId | undefined): boolean =>
	nonNullish(id) && ICP_NETWORK_ID === id;

export const isNetworkIdEthereum = (id: NetworkId | undefined): boolean =>
	nonNullish(id) && SUPPORTED_ETHEREUM_NETWORKS_IDS.includes(id);

export const isNetworkIdBitcoin = (id: NetworkId | undefined): boolean =>
	nonNullish(id) && BITCOIN_NETWORKS_IDS.includes(id);
