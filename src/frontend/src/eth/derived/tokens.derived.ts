import { ETH_MAINNET_ENABLED } from '$env/networks.eth.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens.env';
import { testnets } from '$lib/derived/testnets.derived';
import type { RequiredToken } from '$lib/types/token';
import { derived, type Readable } from 'svelte/store';

export const enabledEthereumTokens: Readable<RequiredToken[]> = derived(
	[testnets],
	([$testnets]) => [
		...(ETH_MAINNET_ENABLED ? [ETHEREUM_TOKEN] : []),
		...($testnets ? [SEPOLIA_TOKEN] : [])
	]
);
