import * as baseEnv from '$env/networks/networks-evm/networks.evm.base.env';
import {
	BASE_ETH_TOKEN,
	BASE_SEPOLIA_ETH_TOKEN
} from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { enabledBaseTokens } from '$evm/base/derived/tokens.derived';
import * as appContants from '$lib/constants/app.constants';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { get } from 'svelte/store';

describe('tokens.derived', () => {
	describe('enabledBaseTokens', () => {
		beforeEach(() => {
			vi.resetAllMocks();

			setupTestnetsStore('reset');

			vi.spyOn(baseEnv, 'BASE_MAINNET_ENABLED', 'get').mockImplementationOnce(() => true);

			vi.spyOn(appContants, 'LOCAL', 'get').mockImplementation(() => false);
		});

		it('should return only Base ETH by default', () => {
			expect(get(enabledBaseTokens)).toEqual([BASE_ETH_TOKEN]);
		});

		it('should return an empty array when mainnet is disabled', () => {
			vi.spyOn(baseEnv, 'BASE_MAINNET_ENABLED', 'get').mockImplementationOnce(() => false);

			expect(get(enabledBaseTokens)).toEqual([]);
		});

		it('should return only Base Sepolia ETH when testnets are enabled and mainnet disabled', () => {
			vi.spyOn(baseEnv, 'BASE_MAINNET_ENABLED', 'get').mockImplementationOnce(() => false);
			setupTestnetsStore('enabled');

			expect(get(enabledBaseTokens)).toEqual([BASE_SEPOLIA_ETH_TOKEN]);
		});

		it('should return Base ETH and Sepolia ETH when testnets are enabled', () => {
			setupTestnetsStore('enabled');

			expect(get(enabledBaseTokens)).toEqual([BASE_ETH_TOKEN, BASE_SEPOLIA_ETH_TOKEN]);
		});
	});
});
