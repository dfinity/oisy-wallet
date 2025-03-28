import { ETH_MAINNET_ENABLED } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { testnetsEnabled } from '$lib/derived/testnets.derived';
import type { RequiredTokenWithLinkedData } from '$lib/types/token';
import { derived, type Readable } from 'svelte/store';

export const enabledEthereumTokens: Readable<RequiredTokenWithLinkedData[]> = derived(
	[testnetsEnabled],
	([$testnetsEnabled]) => [
		...(ETH_MAINNET_ENABLED ? [ETHEREUM_TOKEN] : []),
		...($testnetsEnabled ? [SEPOLIA_TOKEN] : [])
	]
);
