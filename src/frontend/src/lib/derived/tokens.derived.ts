import { enabledBitcoinTokens } from '$btc/derived/tokens.derived';
import { BTC_MAINNET_TOKEN } from '$env/tokens.btc.env';
import { ETHEREUM_TOKEN, ICP_TOKEN } from '$env/tokens.env';
import { erc20Tokens } from '$eth/derived/erc20.derived';
import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
import { icrcChainFusionDefaultTokens, sortedIcrcTokens } from '$icp/derived/icrc.derived';
import { exchanges } from '$lib/derived/exchange.derived';
import type { Token, TokenToPin } from '$lib/types/token';
import { pinTokensAtTop, sortTokens } from '$lib/utils/tokens.utils';
import { derived, type Readable } from 'svelte/store';

const tokens: Readable<Token[]> = derived(
	[erc20Tokens, sortedIcrcTokens, enabledEthereumTokens, enabledBitcoinTokens],
	([$erc20Tokens, $icrcTokens, $enabledEthereumTokens, $enabledBitcoinTokens]) => [
		ICP_TOKEN,
		...$enabledBitcoinTokens,
		...$enabledEthereumTokens,
		...$erc20Tokens,
		...$icrcTokens
	]
);

export const tokensToPin: Readable<TokenToPin[]> = derived(
	[icrcChainFusionDefaultTokens],
	([$icrcChainFusionDefaultTokens]) => [
		ICP_TOKEN,
		BTC_MAINNET_TOKEN,
		ETHEREUM_TOKEN,
		...$icrcChainFusionDefaultTokens
	]
);

/**
 * All tokens sorted by market cap, with the ones to pin at the top of the list.
 */
export const combinedDerivedSortedTokens: Readable<Token[]> = derived(
	[tokens, tokensToPin, exchanges],
	([$tokens, $tokensToPin, $exchanges]) =>
		pinTokensAtTop({ $tokens: sortTokens({ $tokens, $exchanges }), $tokensToPin })
);
