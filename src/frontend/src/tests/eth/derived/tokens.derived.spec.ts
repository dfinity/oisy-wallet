import * as ethEnv from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
import * as appContants from '$lib/constants/app.constants';
import { testnetsStore } from '$lib/stores/settings.store';
import { get } from 'svelte/store';

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

		it('should return an empty array when mainnet is disabled', () => {
			vi.spyOn(ethEnv, 'ETH_MAINNET_ENABLED', 'get').mockImplementationOnce(() => false);

			expect(get(enabledEthereumTokens)).toEqual([]);
		});

		it('should return only Sepolia ETH when testnets are enabled and mainnet disabled', () => {
			vi.spyOn(ethEnv, 'ETH_MAINNET_ENABLED', 'get').mockImplementationOnce(() => false);
			testnetsStore.set({ key: 'testnets', value: { enabled: true } });

			expect(get(enabledEthereumTokens)).toEqual([SEPOLIA_TOKEN]);
		});

		it('should return ETH and Sepolia ETH when testnets are enabled', () => {
			testnetsStore.set({ key: 'testnets', value: { enabled: true } });

			expect(get(enabledEthereumTokens)).toEqual([ETHEREUM_TOKEN, SEPOLIA_TOKEN]);
		});
	});
});
