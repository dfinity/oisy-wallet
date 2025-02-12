import { enabledBitcoinTokens } from '$btc/derived/tokens.derived';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { erc20Tokens } from '$eth/derived/erc20.derived';
import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
import type { Erc20Token } from '$eth/types/erc20';
import { icrcChainFusionDefaultTokens, sortedIcrcTokens } from '$icp/derived/icrc.derived';
import type { IcToken } from '$icp/types/ic-token';
import { exchanges } from '$lib/derived/exchange.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { Token, TokenToPin } from '$lib/types/token';
import type { TokensTotalUsdBalancePerNetwork } from '$lib/types/token-balance';
import {
	filterEnabledTokens,
	sumMainnetTokensUsdBalancesPerNetwork
} from '$lib/utils/tokens.utils';
import { splTokens } from '$sol/derived/spl.derived';
import { enabledSolanaTokens } from '$sol/derived/tokens.derived';
import { derived, type Readable } from 'svelte/store';

export const tokens: Readable<Token[]> = derived(
	[
		erc20Tokens,
		sortedIcrcTokens,
		splTokens,
		enabledEthereumTokens,
		enabledBitcoinTokens,
		enabledSolanaTokens
	],
	([
		$erc20Tokens,
		$icrcTokens,
		$splTokens,
		$enabledEthereumTokens,
		$enabledBitcoinTokens,
		$enabledSolanaTokens
	]) => [
		ICP_TOKEN,
		...$enabledBitcoinTokens,
		...$enabledEthereumTokens,
		...$enabledSolanaTokens,
		...$erc20Tokens,
		...$icrcTokens,
		...$splTokens
	]
);

export const tokensToPin: Readable<TokenToPin[]> = derived(
	[icrcChainFusionDefaultTokens],
	([$icrcChainFusionDefaultTokens]) => [
		BTC_MAINNET_TOKEN,
		ETHEREUM_TOKEN,
		ICP_TOKEN,
		SOLANA_TOKEN,
		...$icrcChainFusionDefaultTokens
	]
);

/**
 * All user-enabled tokens.
 */
export const enabledTokens: Readable<Token[]> = derived([tokens], filterEnabledTokens);

/**
 * It isn't performant to post filter again the Erc20 tokens that are enabled, but it's code wise convenient to avoid duplication of logic.
 */
export const enabledErc20Tokens: Readable<Erc20Token[]> = derived(
	[enabledTokens],
	([$enabledTokens]) =>
		$enabledTokens.filter(({ standard }) => standard === 'erc20') as Erc20Token[]
);

// TODO: add tests when https://github.com/dfinity/oisy-wallet/pull/2450 is merged
/**
 * The following store is used as reference for the list of WalletWorkers that are started/stopped in the main token page.
 */
export const enabledBtcTokens: Readable<Token[]> = derived(
	[enabledBitcoinTokens],
	filterEnabledTokens
);

/**
 * The following store is used as reference for the list of WalletWorkers that are started/stopped in the main token page.
 */
// TODO: The several dependencies of enabledIcTokens are not strictly only IC tokens, but other tokens too.
//  We should find a better way to handle this, improving the store.
export const enabledIcTokens: Readable<IcToken[]> = derived(
	[enabledTokens],
	([$enabledTokens]) =>
		$enabledTokens.filter(({ standard }) => standard === 'icp' || standard === 'icrc') as IcToken[]
);

/**
 * A store with NetworkId-number dictionary with total USD balance of mainnet tokens per network.
 */
export const enabledMainnetTokensUsdBalancesPerNetwork: Readable<TokensTotalUsdBalancePerNetwork> =
	derived([enabledTokens, balancesStore, exchanges], ([$enabledTokens, $balances, $exchanges]) =>
		sumMainnetTokensUsdBalancesPerNetwork({
			$tokens: $enabledTokens,
			$balances,
			$exchanges
		})
	);
