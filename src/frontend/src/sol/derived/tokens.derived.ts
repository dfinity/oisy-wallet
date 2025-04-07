import { SOL_MAINNET_ENABLED } from '$env/networks/networks.sol.env';
import {
	SOLANA_DEVNET_TOKEN,
	SOLANA_LOCAL_TOKEN,
	SOLANA_TESTNET_TOKEN,
	SOLANA_TOKEN
} from '$env/tokens/tokens.sol.env';
import { LOCAL } from '$lib/constants/app.constants';
import { testnetsEnabled } from '$lib/derived/testnets.derived';
import { userNetworks } from '$lib/derived/user-networks.derived';
import type { RequiredToken } from '$lib/types/token';
import { isUserNetworkEnabled } from '$lib/utils/user-networks.utils';
import { derived, type Readable } from 'svelte/store';

export const enabledSolanaTokens: Readable<RequiredToken[]> = derived(
	[testnetsEnabled, userNetworks],
	([$testnetsEnabled, $userNetworks]) =>
		[
			...(SOL_MAINNET_ENABLED ? [SOLANA_TOKEN] : []),
			...($testnetsEnabled
				? [SOLANA_TESTNET_TOKEN, SOLANA_DEVNET_TOKEN, ...(LOCAL ? [SOLANA_LOCAL_TOKEN] : [])]
				: [])
		].filter(({ network: { id: networkId } }) =>
			isUserNetworkEnabled({ userNetworks: $userNetworks, networkId })
		)
);
