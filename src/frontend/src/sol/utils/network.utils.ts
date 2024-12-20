import type { NetworkId } from '$lib/types/network';
import {
	isNetworkIdSOLDevnet,
	isNetworkIdSOLLocal,
	isNetworkIdSOLMainnet,
	isNetworkIdSOLTestnet
} from '$lib/utils/network.utils';
import { SolanaNetworks, type SolanaNetworkType } from '$sol/types/network';

export const mapNetworkIdToNetwork = (networkSymbol: NetworkId): SolanaNetworkType | undefined => {
	if (isNetworkIdSOLMainnet(networkSymbol)) {
		return SolanaNetworks.mainnet;
	}
	if (isNetworkIdSOLTestnet(networkSymbol)) {
		return SolanaNetworks.testnet;
	}
	if (isNetworkIdSOLDevnet(networkSymbol)) {
		return SolanaNetworks.devnet;
	}
	if (isNetworkIdSOLLocal(networkSymbol)) {
		return SolanaNetworks.local;
	}
};
