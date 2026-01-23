import { KASPA_TESTNET_NETWORK_ID } from '$env/networks/networks.kaspa.env';
import type { NetworkId } from '$lib/types/network';

export const isNetworkIdKaspaTestnet = (networkId: NetworkId): boolean =>
	networkId === KASPA_TESTNET_NETWORK_ID;
