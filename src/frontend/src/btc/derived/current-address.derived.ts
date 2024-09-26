import {
	BTC_MAINNET_NETWORK_ID,
	BTC_REGTEST_NETWORK_ID,
	BTC_TESTNET_NETWORK_ID
} from '$env/networks.env';
import {
	btcAddressMainnet,
	btcAddressRegtest,
	btcAddressTestnet
} from '$lib/derived/address.derived';
import { networkId } from '$lib/derived/network.derived';
import type { OptionBtcAddress } from '$lib/types/address';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const currentBtcAddress: Readable<OptionBtcAddress | undefined> = derived(
	[networkId, btcAddressMainnet, btcAddressTestnet, btcAddressRegtest],
	([$networkId, $btcAddressMainnet, $btcAddressTestnet, $btcAddressRegtest]) => {
		const mapper: Record<symbol, OptionBtcAddress> = {
			[BTC_MAINNET_NETWORK_ID]: $btcAddressMainnet,
			[BTC_TESTNET_NETWORK_ID]: $btcAddressTestnet,
			[BTC_REGTEST_NETWORK_ID]: $btcAddressRegtest
		};
		if (nonNullish($networkId)) {
			return mapper[$networkId];
		}
	}
);
