import { XRP_MAINNET_ENABLED } from '$env/networks/networks.xrp.env';
import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { testnetsEnabled } from '$lib/derived/testnets.derived';
import { userNetworks } from '$lib/derived/user-networks.derived';
import type { RequiredToken } from '$lib/types/token';
import { defineEnabledTokens } from '$lib/utils/tokens.utils';
import { derived, type Readable } from 'svelte/store';

export const enabledXrpTokens: Readable<RequiredToken[]> = derived(
	[testnetsEnabled, userNetworks],
	([$testnetsEnabled, $userNetworks]) =>
		defineEnabledTokens({
			$testnetsEnabled,
			$userNetworks,
			mainnetFlag: XRP_MAINNET_ENABLED,
			mainnetTokens: [XRP_TOKEN]
		})
);
