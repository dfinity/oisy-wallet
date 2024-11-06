import * as ethEnv from '$env/networks.eth.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens.env';
import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
import * as appContants from '$lib/constants/app.constants';
import { testnetsStore } from '$lib/stores/settings.store';
import { get } from 'svelte/store';
import { expect } from 'vitest';

describe('tokens.derived', () => {
	describe('enabledEthereumTokens', () => {
		beforeEach(() => {
			vi.resetAllMocks();

			testnetsStore.reset({ key: 'testnets' });

			vi.spyOn(ethEnv, 'ETH_MAINNET_ENABLED', 'get').mockImplementation(() => true);

			vi.spyOn(appContants, 'LOCAL', 'get').mockImplementation(() => false);
		});

		it('should return only ETH by default', () => {
			expect(get(enabledEthereumTokens)).toEqual([ETHEREUM_TOKEN]);
		});

		it('should return ETH and Sepolia when testnets are enabled', () => {
			testnetsStore.set({ key: 'testnets', value: { enabled: true } });

			expect(get(enabledEthereumTokens)).toEqual([ETHEREUM_TOKEN, SEPOLIA_TOKEN]);
		});

		it('should return ETH and Sepolia when in local env', () => {
			vi.spyOn(appContants, 'LOCAL', 'get').mockImplementationOnce(() => true);

			expect(get(enabledEthereumTokens)).toEqual([ETHEREUM_TOKEN, SEPOLIA_TOKEN]);
		});
	});
});
