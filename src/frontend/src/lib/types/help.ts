import type { Network } from '$lib/types/network';
import type { SwapProvider } from '$lib/types/swap';
import type { Nullish } from '@dfinity/zod-schemas';

// The chain a Help page explorer link is scoped to. The values double as the
// `event_value` of the `network` analytics key, so they follow the `token_network`
// vocabulary documented in docs/ai/frontend/analytics.md.
//
// The provider card only ever uses the four chains its providers settle against; the
// network card adds the remaining EVM mainnets, where one Ethereum address is read on
// several chains.
export type HelpExplorerChain = 'eth' | 'sol' | 'btc' | 'icp' | 'arb' | 'base' | 'bsc' | 'pol';

export interface HelpExplorerLink {
	chain: HelpExplorerChain;
	// Already carries the user's address for `chain`; built by `buildHelpExplorerGroups`.
	url: string;
}

export interface HelpExplorerGroup {
	provider: SwapProvider;
	// Never empty: a provider whose addresses are all still loading is dropped entirely.
	links: HelpExplorerLink[];
}

export interface HelpNetworkExplorerLink {
	network: Network;
	chain: HelpExplorerChain;
	// Already carries the user's address on `network`; built by
	// `buildHelpNetworkExplorerLinks`.
	url: string;
}

export interface HelpExplorerAddresses {
	// One Ethereum address covers every EVM network OISY supports, so a single entry
	// serves all of them.
	ethAddress?: Nullish<string>;
	solAddress?: Nullish<string>;
	btcAddress?: Nullish<string>;
	principal?: Nullish<string>;
}
