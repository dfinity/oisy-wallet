import { BTC_MAINNET_ENABLED } from '$env/networks/networks.btc.env';
import {
	BTC_MAINNET_TOKEN,
	BTC_REGTEST_TOKEN,
	BTC_TESTNET_TOKEN
} from '$env/tokens/tokens.btc.env';
import { testnetsEnabled } from '$lib/derived/testnets.derived';
import { userNetworks } from '$lib/derived/user-networks.derived';
import type { Token } from '$lib/types/token';
import { defineEnabledTokens } from '$lib/utils/tokens.utils';
import { derived, type Readable } from 'svelte/store';

export const enabledBitcoinTokens: Readable<Token[]> = derived(
	[testnetsEnabled, userNetworks],
	([$testnetsEnabled, $userNetworks]) =>
		defineEnabledTokens({
			$testnetsEnabled,
			$userNetworks,
			mainnetFlag: BTC_MAINNET_ENABLED,
			mainnetTokens: [BTC_MAINNET_TOKEN],
			testnetTokens: [BTC_TESTNET_TOKEN],
			localTokens: [BTC_REGTEST_TOKEN]
		})
);
