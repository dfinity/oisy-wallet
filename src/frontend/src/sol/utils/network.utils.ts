import type { NetworkId } from '$lib/types/network';
import {
	isNetworkIdSOLDevnet,
	isNetworkIdSOLLocal,
	isNetworkIdSOLMainnet,
	isNetworkIdSOLTestnet
} from '$lib/utils/network.utils';
import { SolanaNetworks, type SolanaNetworkType } from '$sol/types/network';

export const mapNetworkIdToNetwork = (networkId: NetworkId): SolanaNetworkType | undefined => {
	if (isNetworkIdSOLMainnet(networkId)) {
		return SolanaNetworks.mainnet;
	}
	if (isNetworkIdSOLTestnet(networkId)) {
		return SolanaNetworks.testnet;
	}
	if (isNetworkIdSOLDevnet(networkId)) {
		return SolanaNetworks.devnet;
	}
	if (isNetworkIdSOLLocal(networkId)) {
		return SolanaNetworks.local;
	}
};
