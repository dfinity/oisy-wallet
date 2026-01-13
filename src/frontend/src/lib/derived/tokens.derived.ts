import { enabledBitcoinTokens } from '$btc/derived/tokens.derived';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN, TESTICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { erc1155Tokens } from '$eth/derived/erc1155.derived';
import { erc20Tokens } from '$eth/derived/erc20.derived';
import { erc721Tokens } from '$eth/derived/erc721.derived';
import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
import type { Erc20Token } from '$eth/types/erc20';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { isDefaultEthereumToken } from '$eth/utils/eth.utils';
import { enabledEvmTokens } from '$evm/derived/tokens.derived';
import { extTokens } from '$icp/derived/ext.derived';
import { icPunksTokens } from '$icp/derived/icpunks.derived';
import { icrcChainFusionDefaultTokens, sortedIcrcTokens } from '$icp/derived/icrc.derived';
import { defaultIcpTokens } from '$icp/derived/tokens.derived';
import type { IcToken } from '$icp/types/ic-token';
import { isTokenIc } from '$icp/utils/icrc.utils';
import { CustomTokenSection } from '$lib/enums/custom-token-section';
import type { NonFungibleToken } from '$lib/types/nft';
import type { Token, TokenToPin } from '$lib/types/token';
import { filterEnabledTokens } from '$lib/utils/tokens.utils';
import { splTokens } from '$sol/derived/spl.derived';
import { enabledSolanaTokens } from '$sol/derived/tokens.derived';
import type { SplToken } from '$sol/types/spl';
import { isTokenSpl } from '$sol/utils/spl.utils';
import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const nativeTokens: Readable<Token[]> = derived(
	[
		defaultIcpTokens,
		enabledBitcoinTokens,
		enabledEthereumTokens,
		enabledEvmTokens,
		enabledSolanaTokens
	],
	([
		$defaultIcpTokens,
		$enabledBitcoinTokens,
		$enabledEthereumTokens,
		$enabledEvmTokens,
		$enabledSolanaTokens
	]) => [
		...$defaultIcpTokens,
		...$enabledBitcoinTokens,
		...$enabledEthereumTokens,
		...$enabledSolanaTokens,
		...$enabledEvmTokens
	]
);

export const fungibleTokens: Readable<Token[]> = derived(
	[nativeTokens, erc20Tokens, sortedIcrcTokens, splTokens],
	([$nativeTokens, $erc20Tokens, $icrcTokens, $splTokens]) => [
		...$nativeTokens,
		...$erc20Tokens,
		...$icrcTokens,
		...$splTokens
	]
);

export const nonFungibleTokens: Readable<NonFungibleToken[]> = derived(
	[erc721Tokens, erc1155Tokens, extTokens, icPunksTokens],
	([$erc721Tokens, $erc1155Tokens, $extTokens, $icPunksTokens]) => [
		...$erc721Tokens,
		...$erc1155Tokens,
		...$extTokens,
		...$icPunksTokens
	]
);

export const tokens: Readable<Token[]> = derived(
	[fungibleTokens, nonFungibleTokens],
	([$fungibleTokens, $nonFungibleTokens]) => [...$fungibleTokens, ...$nonFungibleTokens]
);

export const defaultEthereumTokens: Readable<Token[]> = derived([tokens], ([$tokens]) =>
	$tokens.filter((token) => isDefaultEthereumToken(token))
);

export const tokensToPin: Readable<TokenToPin[]> = derived(
	[icrcChainFusionDefaultTokens, defaultEthereumTokens],
	([$icrcChainFusionDefaultTokens, $defaultEthereumTokens]) => [
		BTC_MAINNET_TOKEN,
		ETHEREUM_TOKEN,
		ICP_TOKEN,
		TESTICP_TOKEN,
		SOLANA_TOKEN,
		...$icrcChainFusionDefaultTokens,
		...$defaultEthereumTokens.filter((token) => token !== ETHEREUM_TOKEN)
	]
);

/**
 * All user-enabled tokens.
 */
export const enabledTokens: Readable<Token[]> = derived([tokens], filterEnabledTokens);

/**
 * All user-enabled unique tokens symbols.
 */
export const enabledUniqueTokensSymbols: Readable<Token['symbol'][]> = derived(
	[enabledTokens],
	([$enabledTokens]) => Array.from(new Set($enabledTokens.map(({ symbol }) => symbol)))
);

/**
 * All user-enabled fungible tokens.
 */
export const enabledFungibleTokens: Readable<Token[]> = derived(
	[fungibleTokens],
	filterEnabledTokens
);

/**
 * All user-enabled non-fungible tokens
 */
export const enabledNonFungibleTokens: Readable<NonFungibleToken[]> = derived(
	[nonFungibleTokens],
	filterEnabledTokens
);

const enabledNonFungibleTokensBySection: Readable<
	Record<CustomTokenSection | 'null', NonFungibleToken[]>
> = derived([enabledNonFungibleTokens], ([$enabledNonFungibleTokens]) =>
	$enabledNonFungibleTokens.reduce<Record<CustomTokenSection | 'null', NonFungibleToken[]>>(
		(acc, token) => {
			const { section } = token;

			const key = isNullish(section) ? 'null' : section;

			(acc[key] ??= []).push(token);

			return acc;
		},
		{} as Record<CustomTokenSection | 'null', NonFungibleToken[]>
	)
);

export const enabledNonFungibleTokensWithoutSection: Readable<NonFungibleToken[]> = derived(
	[enabledNonFungibleTokensBySection],
	([$enabledNonFungibleTokensBySection]) => $enabledNonFungibleTokensBySection['null'] ?? []
);

export const enabledNonFungibleTokensBySectionHidden: Readable<NonFungibleToken[]> = derived(
	[enabledNonFungibleTokensBySection],
	([$enabledNonFungibleTokensBySection]) =>
		$enabledNonFungibleTokensBySection[CustomTokenSection.HIDDEN] ?? []
);

export const enabledNonFungibleTokensBySectionSpam: Readable<NonFungibleToken[]> = derived(
	[enabledNonFungibleTokensBySection],
	([$enabledNonFungibleTokensBySection]) =>
		$enabledNonFungibleTokensBySection[CustomTokenSection.SPAM] ?? []
);

export const enabledNonFungibleTokensWithoutSpam: Readable<NonFungibleToken[]> = derived(
	[enabledNonFungibleTokensWithoutSection, enabledNonFungibleTokensBySectionHidden],
	([$enabledNonFungibleTokensWithoutSection, $enabledNonFungibleTokensBySectionHidden]) => [
		...$enabledNonFungibleTokensWithoutSection,
		...$enabledNonFungibleTokensBySectionHidden
	]
);

/**
 * It isn't performant to post filter again the Erc20 tokens that are enabled, but it's codewise convenient to avoid duplication of logic.
 */
export const enabledErc20Tokens: Readable<Erc20Token[]> = derived(
	[enabledTokens],
	([$enabledTokens]) => $enabledTokens.filter(isTokenErc20)
);

/**
 * The following store is used as a reference for the list of WalletWorkers that are started/stopped in the main token page.
 */
// TODO: The several dependencies of enabledIcTokens are not strictly only IC tokens, but other tokens too.
//  We should find a better way to handle this, improving the store.
export const enabledIcTokens: Readable<IcToken[]> = derived([enabledTokens], ([$enabledTokens]) =>
	$enabledTokens.filter(isTokenIc)
);

/**
 * The following store is used as a reference for the list of WalletWorkers that are started/stopped in the main token page.
 */
export const enabledSplTokens: Readable<SplToken[]> = derived([enabledTokens], ([$enabledTokens]) =>
	$enabledTokens.filter(isTokenSpl)
);
