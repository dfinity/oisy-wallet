import { KASPA_MAINNET_ENABLED } from '$env/networks/networks.kaspa.env';
import { KASPA_MAINNET_TOKEN, KASPA_TESTNET_TOKEN } from '$env/tokens/tokens.kaspa.env';
import { testnetsEnabled } from '$lib/derived/testnets.derived';
import { userNetworks } from '$lib/derived/user-networks.derived';
import type { Token } from '$lib/types/token';
import { defineEnabledTokens } from '$lib/utils/tokens.utils';
import { derived, type Readable } from 'svelte/store';

export const enabledKaspaTokens: Readable<Token[]> = derived(
	[testnetsEnabled, userNetworks],
	([$testnetsEnabled, $userNetworks]) =>
		defineEnabledTokens({
			$testnetsEnabled,
			$userNetworks,
			mainnetFlag: KASPA_MAINNET_ENABLED,
			mainnetTokens: [KASPA_MAINNET_TOKEN],
			testnetTokens: [KASPA_TESTNET_TOKEN]
		})
);
