import type { Network } from '$lib/types/network';

export interface BitcoinAppMetadata {
	explorerUrl?: string;
}

export type BitcoinNetwork = Network & BitcoinAppMetadata;
