import * as solEnv from '$env/networks/networks.sol.env';
import {
	SOLANA_DEVNET_TOKEN,
	SOLANA_TESTNET_TOKEN,
	SOLANA_TOKEN
} from '$env/tokens/tokens.sol.env';
import * as appConstants from '$lib/constants/app.constants';
import {
	solAddressDevnetStore,
	solAddressLocalnetStore,
	solAddressMainnetStore,
	solAddressTestnetStore
} from '$lib/stores/address.store';
import { testnetsStore } from '$lib/stores/settings.store';
import SolLoaderWallets from '$sol/components/core/SolLoaderWallets.svelte';
import { enabledSolanaTokens } from '$sol/derived/tokens.derived';
import { initSolWalletWorker } from '$sol/services/worker.sol-wallet.services';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock('$sol/services/worker.sol-wallet.services', () => ({
	initSolWalletWorker: vi.fn()
}));

describe('SolLoaderWallets', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Reset all address stores
		solAddressLocalnetStore.reset();
		solAddressTestnetStore.reset();
		solAddressDevnetStore.reset();
		solAddressMainnetStore.reset();
		testnetsStore.reset({ key: 'testnets' });

		vi.spyOn(solEnv, 'SOLANA_NETWORK_ENABLED', 'get').mockImplementation(() => true);

		vi.spyOn(appConstants, 'LOCAL', 'get').mockImplementation(() => false);
	});

	it('should not initialize wallet workers when no addresses are available', () => {
		testnetsStore.set({ key: 'testnets', value: { enabled: true } });

		render(SolLoaderWallets);

		// With testnets enabled, we expect mainnet + testnet + devnet tokens
		expect(get(enabledSolanaTokens).length).toBe(3);
		expect(initSolWalletWorker).not.toHaveBeenCalled();
	});

	it('should initialize wallet workers only for networks with available addresses', () => {
		const testnetAddress = 'testnet-address';
		const mainnetAddress = 'mainnet-address';

		testnetsStore.set({ key: 'testnets', value: { enabled: true } });
		solAddressTestnetStore.set({ data: testnetAddress, certified: true });
		solAddressMainnetStore.set({ data: mainnetAddress, certified: true });

		render(SolLoaderWallets);

		const walletWorkerTokens = get(enabledSolanaTokens).filter(
			({ network: { id: networkId } }) =>
				(networkId === SOLANA_TESTNET_TOKEN.network.id && testnetAddress) ||
				(networkId === SOLANA_TOKEN.network.id && mainnetAddress)
		);

		expect(walletWorkerTokens.length).toBe(2);
	});

	it('should update wallet workers when addresses change', async () => {
		const devnetAddress = 'devnet-address';
		testnetsStore.set({ key: 'testnets', value: { enabled: true } });

		const { rerender } = render(SolLoaderWallets);

		expect(initSolWalletWorker).not.toHaveBeenCalled();

		solAddressDevnetStore.set({ data: devnetAddress, certified: true });
		await rerender({});

		const walletWorkerTokens = get(enabledSolanaTokens).filter(
			({ network: { id: networkId } }) =>
				networkId === SOLANA_DEVNET_TOKEN.network.id && devnetAddress
		);

		expect(walletWorkerTokens.length).toBe(1);
	});

	it('should handle empty enabled tokens list when Solana network is disabled', () => {
		vi.spyOn(solEnv, 'SOLANA_NETWORK_ENABLED', 'get').mockImplementation(() => false);
		render(SolLoaderWallets);
		expect(get(enabledSolanaTokens).length).toBe(0);
		expect(initSolWalletWorker).not.toHaveBeenCalled();
	});

	it('should handle all networks having addresses', () => {
		testnetsStore.set({ key: 'testnets', value: { enabled: true } });
		solAddressLocalnetStore.set({ data: 'local-address', certified: true });
		solAddressTestnetStore.set({ data: 'testnet-address', certified: true });
		solAddressDevnetStore.set({ data: 'devnet-address', certified: true });
		solAddressMainnetStore.set({ data: 'mainnet-address', certified: true });

		render(SolLoaderWallets);

		const walletWorkerTokens = get(enabledSolanaTokens).filter(
			({ network: { id: networkId } }) =>
				networkId === SOLANA_TESTNET_TOKEN.network.id ||
				networkId === SOLANA_TOKEN.network.id ||
				networkId === SOLANA_DEVNET_TOKEN.network.id
		);

		expect(walletWorkerTokens.length).toBe(3);
	});

	it('should include local network token when LOCAL is true', () => {
		vi.spyOn(appConstants, 'LOCAL', 'get').mockImplementation(() => true);
		testnetsStore.set({ key: 'testnets', value: { enabled: true } });

		render(SolLoaderWallets);

		// With LOCAL true and testnets enabled, we expect mainnet + testnet + devnet + local tokens
		expect(get(enabledSolanaTokens).length).toBe(4);
	});
});
