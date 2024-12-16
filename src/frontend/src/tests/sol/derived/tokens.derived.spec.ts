import * as solEnv from '$env/networks/networks.sol.env';
import {
	SOLANA_DEVNET_TOKEN,
	SOLANA_LOCAL_TOKEN,
	SOLANA_TESTNET_TOKEN,
	SOLANA_TOKEN
} from '$env/tokens/tokens.sol.env';
import * as appContants from '$lib/constants/app.constants';
import { testnetsStore } from '$lib/stores/settings.store';
import { enabledSolanaTokens } from '$sol/derived/tokens.derived';
import { get } from 'svelte/store';

describe('tokens.derived', () => {
	describe('enabledSolanaTokens', () => {
		beforeEach(() => {
			vi.resetAllMocks();

			testnetsStore.reset({ key: 'testnets' });

			vi.spyOn(solEnv, 'SOLANA_NETWORK_ENABLED', 'get').mockImplementation(() => true);
		});

		it('should return only mainnet token by default', () => {
			expect(get(enabledSolanaTokens)).toEqual([SOLANA_TOKEN]);
		});

		it('should return emtpy array if feature flag false', () => {
			vi.spyOn(solEnv, 'SOLANA_NETWORK_ENABLED', 'get').mockImplementation(() => false);
			expect(get(enabledSolanaTokens)).toEqual([]);
		});

		it('should return testnet tokens when they are enabled', () => {
			testnetsStore.set({ key: 'testnets', value: { enabled: true } });
			vi.spyOn(appContants, 'LOCAL', 'get').mockImplementationOnce(() => false);

			expect(get(enabledSolanaTokens)).toEqual([
				SOLANA_TOKEN,
				SOLANA_TESTNET_TOKEN,
				SOLANA_DEVNET_TOKEN
			]);
		});

		it('should return localnet token when in local env', () => {
			testnetsStore.set({ key: 'testnets', value: { enabled: true } });
			vi.spyOn(appContants, 'LOCAL', 'get').mockImplementationOnce(() => true);

			expect(get(enabledSolanaTokens)).toEqual([
				SOLANA_TOKEN,
				SOLANA_TESTNET_TOKEN,
				SOLANA_DEVNET_TOKEN,
				SOLANA_LOCAL_TOKEN
			]);
		});
	});
});
