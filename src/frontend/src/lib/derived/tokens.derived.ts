import { ICP_TOKEN } from '$env/tokens.env';
import { erc20DefaultTokens } from '$eth/derived/erc20.derived';
import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
import { sortedIcrcTokens } from '$icp/derived/icrc.derived';
import type { Token } from '$lib/types/token';
import { derived, type Readable } from 'svelte/store';
import { enabledBitcoinTokens } from '../../btc/derived/tokens.derived';

export const tokens: Readable<Token[]> = derived(
	[erc20DefaultTokens, sortedIcrcTokens, enabledEthereumTokens, enabledBitcoinTokens],
	([$erc20Tokens, $icrcTokens, $enabledEthereumTokens, $enabledBitcoinTokens]) => [
		...$enabledEthereumTokens,
		ICP_TOKEN,
		...$enabledBitcoinTokens,
		...$erc20Tokens,
		...$icrcTokens
	]
);
