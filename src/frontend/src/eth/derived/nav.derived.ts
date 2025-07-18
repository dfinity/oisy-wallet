import { enabledErc20Tokens } from '$eth/derived/erc20.derived';
import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
import { enabledEvmTokens } from '$evm/derived/tokens.derived';
import { routeNetwork, routeToken } from '$lib/derived/nav.derived';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const tokenInitialized: Readable<boolean> = derived(
	[routeToken, routeNetwork, enabledEthereumTokens, enabledEvmTokens, enabledErc20Tokens],
	([$routeToken, $routeNetwork, $enabledEthereumTokens, $enabledEvmTokens, $erc20Tokens]) =>
		nonNullish(
			[...$enabledEthereumTokens, ...$enabledEvmTokens, ...$erc20Tokens].find(
				({ name, network: { id: networkId } }) =>
					name === $routeToken && networkId.description === $routeNetwork
			)
		)
);

export const tokenNotInitialized: Readable<boolean> = derived(
	[tokenInitialized],
	([$tokenInitialized]) => !$tokenInitialized
);
