import { ETHEREUM_TOKEN, ICP_TOKEN, SEPOLIA_TOKEN } from '$env/tokens.env';
import { enabledErc20Tokens } from '$eth/derived/erc20.derived';
import { enabledIcrcTokens } from '$icp/derived/icrc.derived';
import { routeToken } from '$lib/derived/nav.derived';
import { enabledNetworkTokensUi } from '$lib/derived/network-tokens.derived';
import type { OptionToken, OptionTokenUi } from '$lib/types/token';
import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

/**
 * A token derived from the route URL - i.e. if the URL contains a query parameters "token", then this store tries to derive the object from it.
 */
export const pageToken: Readable<OptionToken> = derived(
	[routeToken, enabledErc20Tokens, enabledIcrcTokens],
	([$routeToken, $erc20Tokens, $icrcTokens]) => {
		if (isNullish($routeToken)) {
			return undefined;
		}

		if ($routeToken === ICP_TOKEN.name) {
			return ICP_TOKEN;
		}

		return [...$erc20Tokens, ...$icrcTokens, ETHEREUM_TOKEN, SEPOLIA_TOKEN].find(
			({ name }) => name === $routeToken
		);
	}
);

export const pageTokenUi: Readable<OptionTokenUi> = derived(
	[pageToken, enabledNetworkTokensUi],
	([$pageToken, $enabledNetworkTokensUi]) => {
		if (isNullish($pageToken)) {
			return undefined;
		}
		return $enabledNetworkTokensUi.find(
			({ id, network: { id: networkId } }) =>
				id === $pageToken.id && networkId === $pageToken.network.id
		);
	}
);
