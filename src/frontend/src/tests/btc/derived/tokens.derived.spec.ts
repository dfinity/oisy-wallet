import { enabledBitcoinTokens } from '$btc/derived/tokens.derived';
import * as btcEnv from '$env/networks/networks.btc.env';
import {
	BTC_MAINNET_TOKEN,
	BTC_REGTEST_TOKEN,
	BTC_TESTNET_TOKEN
} from '$env/tokens/tokens.btc.env';
import * as appContants from '$lib/constants/app.constants';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { get } from 'svelte/store';

describe('tokens.derived', () => {
	describe('enabledBitcoinTokens', () => {
		beforeEach(() => {
			vi.resetAllMocks();

			setupTestnetsStore('reset');

			vi.spyOn(btcEnv, 'BTC_MAINNET_ENABLED', 'get').mockImplementation(() => true);

			vi.spyOn(appContants, 'LOCAL', 'get').mockImplementation(() => false);
		});

		it('should return only BTC Mainnet by default', () => {
			expect(get(enabledBitcoinTokens)).toEqual([BTC_MAINNET_TOKEN]);
		});

		it('should return an empty array when BTC Mainnet is disabled', () => {
			vi.spyOn(btcEnv, 'BTC_MAINNET_ENABLED', 'get').mockImplementationOnce(() => false);

			expect(get(enabledBitcoinTokens)).toEqual([]);
		});

		it('should return only BTC Testnet when testnets are enabled and mainnet disabled', () => {
			vi.spyOn(btcEnv, 'BTC_MAINNET_ENABLED', 'get').mockImplementationOnce(() => false);
			setupTestnetsStore('enabled');

			expect(get(enabledBitcoinTokens)).toEqual([BTC_TESTNET_TOKEN]);
		});

		it('should return BTC Mainnet and Testnet when testnets are enabled', () => {
			setupTestnetsStore('enabled');

			expect(get(enabledBitcoinTokens)).toEqual([BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN]);
		});

		it('should return BTC Mainnet, Testnet, and Regtest when in local env and testnets are enabled', () => {
			vi.spyOn(appContants, 'LOCAL', 'get').mockImplementationOnce(() => true);
			setupTestnetsStore('enabled');

			expect(get(enabledBitcoinTokens)).toEqual([
				BTC_MAINNET_TOKEN,
				BTC_TESTNET_TOKEN,
				BTC_REGTEST_TOKEN
			]);
		});
	});
});
