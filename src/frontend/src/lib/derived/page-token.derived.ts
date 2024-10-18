import { enabledBitcoinTokens } from '$btc/derived/tokens.derived';
import { ETHEREUM_TOKEN, ICP_TOKEN, SEPOLIA_TOKEN } from '$env/tokens.env';
import { enabledErc20Tokens } from '$eth/derived/erc20.derived';
import { enabledIcrcTokens } from '$icp/derived/icrc.derived';
import { exchanges } from '$lib/derived/exchange.derived';
import { routeToken } from '$lib/derived/nav.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { OptionToken, OptionTokenUi } from '$lib/types/token';
import { mapTokenUi } from '$lib/utils/token.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

/**
 * A token derived from the route URL - i.e. if the URL contains a query parameters "token", then this store tries to derive the object from it.
 */
export const pageToken: Readable<OptionToken> = derived(
	[routeToken, enabledBitcoinTokens, enabledErc20Tokens, enabledIcrcTokens],
	([$routeToken, $enabledBitcoinTokens, $erc20Tokens, $icrcTokens]) => {
		if (isNullish($routeToken)) {
			return undefined;
		}

		if ($routeToken === ICP_TOKEN.name) {
			return ICP_TOKEN;
		}

		return [
			...$enabledBitcoinTokens,
			...$erc20Tokens,
			...$icrcTokens,
			ETHEREUM_TOKEN,
			SEPOLIA_TOKEN
		].find(({ name }) => name === $routeToken);
	}
);

export const pageTokenUi: Readable<OptionTokenUi> = derived(
	[pageToken, balancesStore, exchanges],
	([$pageToken, $balances, $exchanges]) =>
		nonNullish($pageToken)
			? mapTokenUi({
					token: $pageToken,
					$balances,
					$exchanges
				})
			: undefined
);
