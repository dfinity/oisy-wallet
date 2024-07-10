import type { Erc20Token } from '$eth/types/erc20';
import { pseudoNetworkChainFusion, selectedNetwork } from '$lib/derived/network.derived';
import { sortedTokens } from '$lib/derived/tokens.derived';
import type { Token } from '$lib/types/token';
import { filterTokensForSelectedNetwork } from '$lib/utils/network.utils';
import { derived, type Readable } from 'svelte/store';

/**
 * All tokens matching the selected network or chain fusion, regardless if they are enabled by the user or not.
 */
const networkTokens: Readable<Token[]> = derived(
	[sortedTokens, selectedNetwork, pseudoNetworkChainFusion],
	filterTokensForSelectedNetwork
);

export const enabledNetworkTokens: Readable<Token[]> = derived(
	[networkTokens],
	([$networkTokens]) =>
		$networkTokens.filter((token) => ('enabled' in token ? token.enabled : true))
);

/**
 * It isn't performant to post filter again the Erc20 tokens that are enabled for the specific selected network or no network selected but, it's code wise convenient to avoid duplication of logic.
 */
export const enabledErc20NetworkTokens: Readable<Erc20Token[]> = derived(
	[enabledNetworkTokens],
	([$enabledNetworkTokens]) =>
		$enabledNetworkTokens.filter(({ standard }) => standard === 'erc20') as Erc20Token[]
);
