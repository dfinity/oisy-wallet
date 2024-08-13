import type { Network } from '$lib/types/network';

type BitcoinNetworkBackend = { mainnet: null } | { regtest: null } | { testnet: null };

interface BitcoinBackendData {
	backendEnv: BitcoinNetworkBackend;
}

export type BitcoinNetwork = Network & BitcoinBackendData;
