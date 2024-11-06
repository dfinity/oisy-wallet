import { enabledBitcoinTokens } from '$btc/derived/tokens.derived';
import * as btcEnv from '$env/networks.btc.env';
import { BTC_MAINNET_TOKEN, BTC_REGTEST_TOKEN, BTC_TESTNET_TOKEN } from '$env/tokens.btc.env';
import * as appContants from '$lib/constants/app.constants';
import { testnetsStore } from '$lib/stores/settings.store';
import { get } from 'svelte/store';
import { expect } from 'vitest';

describe('tokens.derived', () => {
	describe('enabledBitcoinTokens', () => {
		beforeEach(() => {
			vi.resetAllMocks();

			testnetsStore.reset({ key: 'testnets' });

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
			testnetsStore.set({ key: 'testnets', value: { enabled: true } });

			expect(get(enabledBitcoinTokens)).toEqual([BTC_TESTNET_TOKEN]);
		});

		it('should return BTC Mainnet and Testnet when testnets are enabled', () => {
			testnetsStore.set({ key: 'testnets', value: { enabled: true } });

			expect(get(enabledBitcoinTokens)).toEqual([BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN]);
		});

		it('should return BTC Mainnet, Testnet, and Regtest when in local env and testnets are enabled', () => {
			vi.spyOn(appContants, 'LOCAL', 'get').mockImplementationOnce(() => true);
			testnetsStore.set({ key: 'testnets', value: { enabled: true } });

			expect(get(enabledBitcoinTokens)).toEqual([
				BTC_MAINNET_TOKEN,
				BTC_TESTNET_TOKEN,
				BTC_REGTEST_TOKEN
			]);
		});
	});
});
