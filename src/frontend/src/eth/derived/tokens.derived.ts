import { ETH_MAINNET_ENABLED } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { testnetsEnabled } from '$lib/derived/testnets.derived';
import { userNetworks } from '$lib/derived/user-networks.derived';
import type { RequiredTokenWithLinkedData } from '$lib/types/token';
import { defineEnabledTokens } from '$lib/utils/tokens.utils';
import { derived, type Readable } from 'svelte/store';

export const enabledEthereumTokens: Readable<RequiredTokenWithLinkedData[]> = derived(
	[testnetsEnabled, userNetworks],
	([$testnetsEnabled, $userNetworks]) =>
		defineEnabledTokens({
			$testnetsEnabled,
			$userNetworks,
			mainnetFlag: ETH_MAINNET_ENABLED,
			mainnetTokens: [ETHEREUM_TOKEN],
			testnetTokens: [SEPOLIA_TOKEN]
		})
);
