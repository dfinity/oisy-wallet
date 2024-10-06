import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens.env';
import { testnets } from '$lib/derived/testnets.derived';
import type { RequiredTokenWithLinkedData } from '$lib/types/token';
import { derived, type Readable } from 'svelte/store';

export const enabledEthereumTokens: Readable<RequiredTokenWithLinkedData[]> = derived(
	[testnets],
	([$testnets]) => [ETHEREUM_TOKEN, ...($testnets ? [SEPOLIA_TOKEN] : [])]
);
