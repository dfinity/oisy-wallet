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
import { token } from '$lib/stores/token.store';
import type { OptionBtcAddress } from '$lib/types/address';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const currentBtcAddress: Readable<OptionBtcAddress | undefined> = derived(
	[token, btcAddressMainnet, btcAddressTestnet, btcAddressRegtest],
	([$token, $btcAddressMainnet, $btcAddressTestnet, $btcAddressRegtest]) => {
		const mapper: Record<symbol, OptionBtcAddress> = {
			[BTC_MAINNET_TOKEN_ID]: $btcAddressMainnet,
			[BTC_TESTNET_TOKEN_ID]: $btcAddressTestnet,
			[BTC_REGTEST_TOKEN_ID]: $btcAddressRegtest
		};
		if (nonNullish($token)) {
			return mapper[$token?.id];
		}
	}
);
