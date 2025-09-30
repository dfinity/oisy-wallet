import { enabledBitcoinTokens } from '$btc/derived/tokens.derived';
import { ICP_TOKEN, TESTICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { enabledErc20Tokens } from '$eth/derived/erc20.derived';
import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
import { isTokenEthereumUserToken } from '$eth/utils/erc20.utils';
import { isNotDefaultEthereumToken } from '$eth/utils/eth.utils';
import { enabledEvmTokens } from '$evm/derived/tokens.derived';
import { enabledIcrcTokens } from '$icp/derived/icrc.derived';
import { icTokenIcrcCustomToken } from '$icp/utils/icrc.utils';
import { routeNetwork, routeToken } from '$lib/derived/nav.derived';
import { pageNft } from '$lib/derived/page-nft.derived';
import { defaultFallbackToken } from '$lib/derived/token.derived';
import { nonFungibleTokens } from '$lib/derived/tokens.derived';
import type { NonFungibleToken } from '$lib/types/nft';
import type { OptionToken, OptionTokenStandard, Token } from '$lib/types/token';
import { findNonFungibleToken } from '$lib/utils/nfts.utils';
import { isIcrcTokenToggleEnabled } from '$lib/utils/token-toggle.utils';
import { enabledSplTokens } from '$sol/derived/spl.derived';
import { enabledSolanaTokens } from '$sol/derived/tokens.derived';
import { isTokenSpl, isTokenSplToggleable } from '$sol/utils/spl.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

/**
 * A token derived from the route URL - i.e. if the URL contains a query parameters "token", then this store tries to derive the object from it.
 */
export const pageToken: Readable<OptionToken> = derived(
	[
		routeToken,
		routeNetwork,
		enabledBitcoinTokens,
		enabledEthereumTokens,
		enabledSolanaTokens,
		enabledEvmTokens,
		enabledErc20Tokens,
		enabledIcrcTokens,
		enabledSplTokens
	],
	([
		$routeToken,
		$routeNetwork,
		$enabledBitcoinTokens,
		$enabledEthereumTokens,
		$enabledSolanaTokens,
		$enabledEvmTokens,
		$erc20Tokens,
		$icrcTokens,
		$splTokens
	]) => {
		if (isNullish($routeToken)) {
			return undefined;
		}

		if ($routeToken === ICP_TOKEN.name) {
			return ICP_TOKEN;
		}

		if ($routeToken === TESTICP_TOKEN.name) {
			return TESTICP_TOKEN;
		}

		return [
			...$enabledBitcoinTokens,
			...$enabledEthereumTokens,
			...$enabledSolanaTokens,
			...$enabledEvmTokens,
			...$erc20Tokens,
			...$icrcTokens,
			...$splTokens
		].find(
			({ name, network: { id: networkId } }) =>
				name === $routeToken && networkId.description === $routeNetwork
		);
	}
);

/**
 * A derived store which can be used for code convenience reasons.
 */
export const pageTokenWithFallback: Readable<Token> = derived(
	[pageToken, defaultFallbackToken],
	([$pageToken, $defaultFallbackToken]) => $pageToken ?? $defaultFallbackToken
);

export const pageTokenStandard: Readable<OptionTokenStandard> = derived(
	[pageToken],
	([$pageToken]) => $pageToken?.standard
);

export const pageTokenToggleable: Readable<boolean> = derived([pageToken], ([$pageToken]) => {
	if (nonNullish($pageToken)) {
		return icTokenIcrcCustomToken($pageToken)
			? isIcrcTokenToggleEnabled($pageToken)
			: isTokenEthereumUserToken($pageToken)
				? isNotDefaultEthereumToken($pageToken)
				: isTokenSpl($pageToken)
					? isTokenSplToggleable($pageToken)
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
