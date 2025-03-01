import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { enabledErc20Tokens } from '$eth/derived/erc20.derived';
import { routeToken } from '$lib/derived/nav.derived';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const tokenInitialized: Readable<boolean> = derived(
	[routeToken, enabledErc20Tokens],
	([$routeToken, $erc20Tokens]) =>
		$routeToken === ETHEREUM_TOKEN.name ||
		$routeToken === SEPOLIA_TOKEN.name ||
		nonNullish($erc20Tokens.find(({ name }) => name === $routeToken))
);

export const tokenNotInitialized: Readable<boolean> = derived(
	[tokenInitialized],
	([$tokenInitialized]) => !$tokenInitialized
);
