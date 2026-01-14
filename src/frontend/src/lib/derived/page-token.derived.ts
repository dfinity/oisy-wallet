import { enabledErc20Tokens } from '$eth/derived/erc20.derived';
import { isTokenEthereumCustomToken } from '$eth/utils/erc20.utils';
import { isNotDefaultEthereumToken } from '$eth/utils/eth.utils';
import { enabledIcrcTokens } from '$icp/derived/icrc.derived';
import { isTokenIcrcCustomToken } from '$icp/utils/icrc.utils';
import { routeNetwork, routeToken } from '$lib/derived/nav.derived';
import { pageNft } from '$lib/derived/page-nft.derived';
import { defaultFallbackToken } from '$lib/derived/token.derived';
import { nativeTokens, nonFungibleTokens } from '$lib/derived/tokens.derived';
import type { NonFungibleToken } from '$lib/types/nft';
import type { OptionToken, OptionTokenStandardCode, Token } from '$lib/types/token';
import { findNonFungibleToken } from '$lib/utils/nfts.utils';
import { isIcrcTokenToggleEnabled } from '$lib/utils/token-toggle.utils';
import { enabledSplTokens } from '$sol/derived/spl.derived';
import { isTokenSpl, isTokenSplCustomToken } from '$sol/utils/spl.utils';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

/**
 * A token derived from the route URL - i.e. if the URL contains a query parameters "token", then this store tries to derive the object from it.
 */
export const pageToken: Readable<OptionToken> = derived(
	[routeToken, routeNetwork, nativeTokens, enabledErc20Tokens, enabledIcrcTokens, enabledSplTokens],
	([$routeToken, $routeNetwork, $nativeTokens, $erc20Tokens, $icrcTokens, $splTokens]) =>
		nonNullish($routeToken)
			? [...$nativeTokens, ...$erc20Tokens, ...$icrcTokens, ...$splTokens].find(
					({ name, network: { id: networkId } }) =>
						name === $routeToken && networkId.description === $routeNetwork
				)
			: undefined
);

/**
 * A derived store which can be used for code convenience reasons.
 */
export const pageTokenWithFallback: Readable<Token> = derived(
	[pageToken, defaultFallbackToken],
	([$pageToken, $defaultFallbackToken]) => $pageToken ?? $defaultFallbackToken
);

export const pageTokenStandard: Readable<OptionTokenStandardCode> = derived(
	[pageToken],
	([$pageToken]) => $pageToken?.standard.code
);

export const pageTokenToggleable: Readable<boolean> = derived([pageToken], ([$pageToken]) => {
	if (nonNullish($pageToken)) {
		return isTokenIcrcCustomToken($pageToken)
			? isIcrcTokenToggleEnabled($pageToken)
			: isTokenEthereumCustomToken($pageToken)
				? isNotDefaultEthereumToken($pageToken)
				: isTokenSpl($pageToken)
					? isTokenSplCustomToken($pageToken)
					: false;
	}

	return false;
});

export const pageNonFungibleToken: Readable<NonFungibleToken | undefined> = derived(
	[pageNft, nonFungibleTokens],
	([$pageNft, $nonFungibleTokens]) =>
		nonNullish($pageNft) && nonNullish($pageNft.collection)
			? findNonFungibleToken({
					tokens: $nonFungibleTokens,
					address: $pageNft.collection.address,
					networkId: $pageNft.collection.network.id
				})
			: undefined
);
