import {
	BTC_MAINNET_TOKEN_ID,
	BTC_REGTEST_TOKEN_ID,
	BTC_TESTNET_TOKEN_ID
} from '$env/tokens.btc.env';
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
			[BTC_MAINNET_TOKEN_ID]: $btcAddressMainnet,
			[BTC_TESTNET_TOKEN_ID]: $btcAddressTestnet,
			[BTC_REGTEST_TOKEN_ID]: $btcAddressRegtest
		};
		if (nonNullish($networkId)) {
			return mapper[$networkId];
		}
	}
);
