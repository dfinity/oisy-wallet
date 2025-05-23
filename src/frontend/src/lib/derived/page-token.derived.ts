import { enabledBitcoinTokens } from '$btc/derived/tokens.derived';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { enabledErc20Tokens } from '$eth/derived/erc20.derived';
import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
import { enabledEvmTokens } from '$evm/derived/tokens.derived';
import { enabledIcrcTokens } from '$icp/derived/icrc.derived';
import { routeNetwork, routeToken } from '$lib/derived/nav.derived';
import type { OptionToken } from '$lib/types/token';
import { enabledSplTokens } from '$sol/derived/spl.derived';
import { enabledSolanaTokens } from '$sol/derived/tokens.derived';
import { isNullish } from '@dfinity/utils';
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
