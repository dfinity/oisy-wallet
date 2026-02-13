import { enabledBitcoinTokens, enabledMainnetBitcoinToken } from '$btc/derived/tokens.derived';
import * as btcEnv from '$env/networks/networks.btc.env';
import { BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN } from '$env/tokens/tokens.btc.env';
import * as appConstants from '$lib/constants/app.constants';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { get } from 'svelte/store';

describe('tokens.derived', () => {
	beforeEach(() => {
		vi.resetAllMocks();

		setupUserNetworksStore('allEnabled');

		vi.spyOn(appConstants, 'LOCAL', 'get').mockImplementation(() => false);
	});

	describe('enabledBitcoinTokens', () => {
		it('should return only BTC by default', () => {
			expect(get(enabledBitcoinTokens)).toEqual([BTC_MAINNET_TOKEN]);
		});

		it('should return an empty array when mainnet is disabled', () => {
			vi.spyOn(btcEnv, 'BTC_MAINNET_ENABLED', 'get').mockImplementationOnce(() => false);

			expect(get(enabledBitcoinTokens)).toEqual([]);
		});

		it('should return only Testnet BTC when testnets are enabled and mainnet disabled', () => {
			vi.spyOn(btcEnv, 'BTC_MAINNET_ENABLED', 'get').mockImplementationOnce(() => false);
			setupTestnetsStore('enabled');

			expect(get(enabledBitcoinTokens)).toEqual([BTC_TESTNET_TOKEN]);
		});

		it('should return BTC and Testnet BTC when testnets are enabled', () => {
			setupTestnetsStore('enabled');

			expect(get(enabledBitcoinTokens)).toEqual([BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN]);
		});
	});

	describe('enabledMainnetBitcoinToken', () => {
		it('should return BTC mainnet token when mainnet is enabled', () => {
			expect(get(enabledMainnetBitcoinToken)).toEqual(BTC_MAINNET_TOKEN);
		});

		it('should return undefined when mainnet is disabled', () => {
			vi.spyOn(btcEnv, 'BTC_MAINNET_ENABLED', 'get').mockImplementationOnce(() => false);

			expect(get(enabledMainnetBitcoinToken)).toBeUndefined();
		});

		it('should return undefined when mainnet is disabled even with testnets enabled', () => {
			vi.spyOn(btcEnv, 'BTC_MAINNET_ENABLED', 'get').mockImplementationOnce(() => false);
			setupTestnetsStore('enabled');

			expect(get(enabledMainnetBitcoinToken)).toBeUndefined();
		});

		it('should return BTC mainnet token when both mainnet and testnets are enabled', () => {
			setupTestnetsStore('enabled');

			expect(get(enabledMainnetBitcoinToken)).toEqual(BTC_MAINNET_TOKEN);
		});
	});
});
