import { pseudoNetworkChainFusion, selectedNetwork } from '$lib/derived/network.derived';
import { enabledFungibleTokens, enabledNonFungibleTokens } from '$lib/derived/tokens.derived';
import { CustomTokenSection } from '$lib/enums/custom-token-section';
import type { NonFungibleToken } from '$lib/types/nft';
import type { Token } from '$lib/types/token';
import { derivedMemo } from '$lib/utils/derived-memo.utils';
import { filterTokensForSelectedNetwork } from '$lib/utils/network.utils';
import { tokenListEqual } from '$lib/utils/tokens.utils';
import { derived, type Readable } from 'svelte/store';

/**
 * All user-enabled fungible tokens matching the selected network or chain fusion.
 */
export const enabledFungibleNetworkTokens: Readable<Token[]> = derivedMemo(
	[enabledFungibleTokens, selectedNetwork, pseudoNetworkChainFusion],
	filterTokensForSelectedNetwork,
	tokenListEqual
);

/**
 * All user-enabled non-fungible tokens matching the selected network or chain fusion.
 */
export const enabledNonFungibleNetworkTokens: Readable<NonFungibleToken[]> = derived(
	[enabledNonFungibleTokens, selectedNetwork, pseudoNetworkChainFusion],
	filterTokensForSelectedNetwork
);

export const enabledNonFungibleNetworkTokensWithoutSpam: Readable<NonFungibleToken[]> = derived(
	[enabledNonFungibleNetworkTokens],
	([$enabledNonFungibleNetworkTokens]) =>
		$enabledNonFungibleNetworkTokens.filter(({ section }) => section != CustomTokenSection.SPAM)
);
