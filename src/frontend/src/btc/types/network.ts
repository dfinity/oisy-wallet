import type { BitcoinNetwork as BitcoinNetworkBackend } from '$declarations/backend/backend.did';
import type { Network } from '$lib/types/network';

interface BitcoinBackendData {
	backendEnv: BitcoinNetworkBackend;
}

export type BitcoinNetwork = Network & BitcoinBackendData;
