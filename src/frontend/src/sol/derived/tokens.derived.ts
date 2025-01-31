import { SOLANA_NETWORK_ENABLED } from '$env/networks/networks.sol.env';
import {
	SOLANA_DEVNET_TOKEN,
	SOLANA_LOCAL_TOKEN,
	SOLANA_TESTNET_TOKEN,
	SOLANA_TOKEN
} from '$env/tokens/tokens.sol.env';
import { LOCAL } from '$lib/constants/app.constants';
import { testnets } from '$lib/derived/testnets.derived';
import type { RequiredToken } from '$lib/types/token';
import { derived, type Readable } from 'svelte/store';

export const enabledSolanaTokens: Readable<RequiredToken[]> = derived([testnets], ([$testnets]) =>
	SOLANA_NETWORK_ENABLED
		? [
				SOLANA_TOKEN,
				...($testnets
					? [SOLANA_TESTNET_TOKEN, SOLANA_DEVNET_TOKEN, ...(LOCAL ? [SOLANA_LOCAL_TOKEN] : [])]
					: [])
			]
		: []
);
