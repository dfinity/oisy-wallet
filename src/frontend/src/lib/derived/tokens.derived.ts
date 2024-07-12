import { BTC_MAINNET_TOKEN } from '$env/tokens.btc.env';
import { ETHEREUM_TOKEN, ICP_TOKEN } from '$env/tokens.env';
import { erc20Tokens } from '$eth/derived/erc20.derived';
import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
import { icrcChainFusionDefaultTokens, sortedIcrcTokens } from '$icp/derived/icrc.derived';
import type { Token, TokenToPin } from '$lib/types/token';
import { pinTokensAtTop } from '$lib/utils/tokens.utils';
import { derived, type Readable } from 'svelte/store';
import { enabledBitcoinTokens } from '../../btc/derived/tokens.derived';

const tokens: Readable<Token[]> = derived(
	[erc20Tokens, sortedIcrcTokens, enabledEthereumTokens, enabledBitcoinTokens],
	([$erc20Tokens, $icrcTokens, $enabledEthereumTokens, $enabledBitcoinTokens]) => [
		ICP_TOKEN,
		...$enabledEthereumTokens,
		...$enabledBitcoinTokens,
		...$erc20Tokens,
		...$icrcTokens
	]
);

const tokensToPin: Readable<TokenToPin[]> = derived(
	[icrcChainFusionDefaultTokens],
	([$icrcChainFusionDefaultTokens]) => [
		ICP_TOKEN,
		BTC_MAINNET_TOKEN,
		ETHEREUM_TOKEN,
		...$icrcChainFusionDefaultTokens
	]
);

export const sortedTokens: Readable<Token[]> = derived(
	[tokens, tokensToPin],
	([$tokens, $tokensToPin]) => pinTokensAtTop({ $tokens, $tokensToPin })
);
