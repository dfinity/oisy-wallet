import { enabledBitcoinTokens } from '$btc/derived/tokens.derived';
import { BTC_MAINNET_TOKEN } from '$env/tokens.btc.env';
import { ETHEREUM_TOKEN, ICP_TOKEN } from '$env/tokens.env';
import { erc20Tokens } from '$eth/derived/erc20.derived';
import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
import { icrcChainFusionDefaultTokens, sortedIcrcTokens } from '$icp/derived/icrc.derived';
import type { IcToken } from '$icp/types/ic';
import type { Token, TokenToPin } from '$lib/types/token';
import { derived, type Readable } from 'svelte/store';

export const tokens: Readable<Token[]> = derived(
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

// TODO: add tests when https://github.com/dfinity/oisy-wallet/pull/2450 is merged
/**
 * The following store is used as reference for the list of WalletWorkers that are started/stopped in the main token page.
 */
export const enabledBtcTokens: Readable<Token[]> = derived(
	[enabledBitcoinTokens],
	([$enabledBitcoinTokens]) => $enabledBitcoinTokens
);

/**
 * The following store is used as reference for the list of WalletWorkers that are started/stopped in the main token page.
 */
// TODO: The several dependencies of enabledIcTokens are not strictly only IC tokens, but other tokens too.
//  We should find a better way to handle this, improving the store.
export const icTokens: Readable<IcToken[]> = derived(
	[tokens],
	([$tokens]) =>
		$tokens.filter(({ standard }) => standard === 'icp' || standard === 'icrc') as IcToken[]
);
