import { ETH_MAINNET_ENABLED } from '$env/networks.eth.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens.env';
import { LOCAL } from '$lib/constants/app.constants';
import { testnetsStore } from '$lib/stores/testnets.store';
import type { Token, TokenId } from '$lib/types/token';
import { derived, type Readable } from 'svelte/store';

export const ethereumTokens: Readable<Required<Token>[]> = derived(
	[testnetsStore],
	([$testnetsStore]) => [
		...(ETH_MAINNET_ENABLED ? [ETHEREUM_TOKEN] : []),
		...($testnetsStore?.enabled ?? LOCAL ? [SEPOLIA_TOKEN] : [])
	]
);

export const ethereumTokenIds: Readable<TokenId[]> = derived(
	[ethereumTokens],
	([$ethereumTokens]) => $ethereumTokens.map(({ id }) => id)
);
