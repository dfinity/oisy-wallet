import { ARBITRUM_MAINNET_ENABLED } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import {
	ARBITRUM_ETH_TOKEN,
	ARBITRUM_SEPOLIA_ETH_TOKEN
} from '$env/tokens/tokens-evm/tokens-arbitrum/tokens.eth.env';
import { testnetsEnabled } from '$lib/derived/testnets.derived';
import { userNetworks } from '$lib/derived/user-networks.derived';
import type { RequiredToken } from '$lib/types/token';
import { defineEnabledTokens } from '$lib/utils/tokens.utils';
import { derived, type Readable } from 'svelte/store';

export const enabledArbitrumTokens: Readable<RequiredToken[]> = derived(
	[testnetsEnabled, userNetworks],
	([$testnetsEnabled, $userNetworks]) =>
		defineEnabledTokens({
			$testnetsEnabled,
			$userNetworks,
			mainnetFlag: ARBITRUM_MAINNET_ENABLED,
			mainnetTokens: [ARBITRUM_ETH_TOKEN],
			testnetTokens: [ARBITRUM_SEPOLIA_ETH_TOKEN]
		})
);
