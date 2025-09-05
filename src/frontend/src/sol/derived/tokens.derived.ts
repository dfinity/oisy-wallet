import { SOL_MAINNET_ENABLED } from '$env/networks/networks.sol.env';
import { SOLANA_DEVNET_TOKEN, SOLANA_LOCAL_TOKEN, SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { testnetsEnabled } from '$lib/derived/testnets.derived';
import { userNetworks } from '$lib/derived/user-networks.derived';
import type { RequiredToken } from '$lib/types/token';
import { defineEnabledTokens } from '$lib/utils/tokens.utils';
import { derived, type Readable } from 'svelte/store';

export const enabledSolanaTokens: Readable<RequiredToken[]> = derived(
	[testnetsEnabled, userNetworks],
	([$testnetsEnabled, $userNetworks]) =>
		defineEnabledTokens({
			$testnetsEnabled,
			$userNetworks,
			mainnetFlag: SOL_MAINNET_ENABLED,
			mainnetTokens: [SOLANA_TOKEN],
			testnetTokens: [SOLANA_DEVNET_TOKEN],
			localTokens: [SOLANA_LOCAL_TOKEN]
		})
);
