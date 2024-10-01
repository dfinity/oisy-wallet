import type { Network, NetworkAppMetadata } from '$lib/types/network';

export type BitcoinNetwork = Network & Partial<NetworkAppMetadata>;
