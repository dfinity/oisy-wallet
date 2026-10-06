import { ROBINHOOD_MAINNET_ENABLED } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import { ROBINHOOD_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-robinhood/tokens.eth.env';
import { testnetsEnabled } from '$lib/derived/testnets.derived';
import { userNetworks } from '$lib/derived/user-networks.derived';
import type { RequiredToken } from '$lib/types/token';
import { defineEnabledTokens } from '$lib/utils/tokens.utils';
import { derived, type Readable } from 'svelte/store';

export const enabledRobinhoodTokens: Readable<RequiredToken[]> = derived(
	[testnetsEnabled, userNetworks],
	([$testnetsEnabled, $userNetworks]) =>
		defineEnabledTokens({
			$testnetsEnabled,
			$userNetworks,
			mainnetFlag: ROBINHOOD_MAINNET_ENABLED,
			mainnetTokens: [ROBINHOOD_ETH_TOKEN]
		})
);
