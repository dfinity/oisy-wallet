import { SOLANA_DEVNET_TOKEN, SOLANA_LOCAL_TOKEN, SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import * as appContants from '$lib/constants/app.constants';
import { enabledSolanaTokens } from '$sol/derived/tokens.derived';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { get } from 'svelte/store';

describe('tokens.derived', () => {
	describe('enabledSolanaTokens', () => {
		beforeEach(() => {
			vi.resetAllMocks();

			setupTestnetsStore('enabled');
			setupUserNetworksStore('allEnabled');
		});

		it('should return only mainnet token by default', () => {
			setupTestnetsStore('disabled');

			expect(get(enabledSolanaTokens)).toEqual([SOLANA_TOKEN]);
		});

		it('should return testnet tokens when they are enabled', () => {
			vi.spyOn(appContants, 'LOCAL', 'get').mockImplementationOnce(() => false);

			expect(get(enabledSolanaTokens)).toEqual([SOLANA_TOKEN, SOLANA_DEVNET_TOKEN]);
		});

		it('should return localnet token when in local env', () => {
			vi.spyOn(appContants, 'LOCAL', 'get').mockImplementationOnce(() => true);

			expect(get(enabledSolanaTokens)).toEqual([
				SOLANA_TOKEN,
				SOLANA_DEVNET_TOKEN,
				SOLANA_LOCAL_TOKEN
			]);
		});
	});
});
