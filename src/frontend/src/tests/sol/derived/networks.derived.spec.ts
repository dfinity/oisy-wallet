import {
	SOLANA_DEVNET_NETWORK,
	SOLANA_LOCAL_NETWORK,
	SOLANA_MAINNET_NETWORK,
	SOLANA_TESTNET_NETWORK
} from '$env/networks/networks.sol.env';
import * as appContants from '$lib/constants/app.constants';
import { testnetsStore } from '$lib/stores/settings.store';
import { enabledSolanaNetworks } from '$sol/derived/networks.derived';
import { get } from 'svelte/store';

describe('networks.derived', () => {
	describe('enabledSolanaNetworks', () => {
		beforeEach(() => {
			vi.resetAllMocks();

			testnetsStore.reset({ key: 'testnets' });

			vi.spyOn(appContants, 'LOCAL', 'get').mockImplementation(() => false);
		});

		it('should return only mainnet by default', () => {
			expect(get(enabledSolanaNetworks)).toEqual([SOLANA_MAINNET_NETWORK]);
		});

		it('should return testnets when they are enabled', () => {
			testnetsStore.set({ key: 'testnets', value: { enabled: true } });

			expect(get(enabledSolanaNetworks)).toEqual([
				SOLANA_MAINNET_NETWORK,
				SOLANA_TESTNET_NETWORK,
				SOLANA_DEVNET_NETWORK
			]);
		});

		it('should return localnet when in local env', () => {
			testnetsStore.set({ key: 'testnets', value: { enabled: true } });
			vi.spyOn(appContants, 'LOCAL', 'get').mockImplementationOnce(() => true);

			expect(get(enabledSolanaNetworks)).toEqual([
				SOLANA_MAINNET_NETWORK,
				SOLANA_TESTNET_NETWORK,
				SOLANA_DEVNET_NETWORK,
				SOLANA_LOCAL_NETWORK
			]);
		});
	});
});
