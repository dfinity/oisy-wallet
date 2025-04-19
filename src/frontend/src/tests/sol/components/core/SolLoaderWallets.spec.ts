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
import { parseSolAddress } from '$lib/validation/address.validation';
import SolLoaderWallets from '$sol/components/core/SolLoaderWallets.svelte';
import { enabledSolanaTokens } from '$sol/derived/tokens.derived';
import { initSolWalletWorker } from '$sol/services/worker.sol-wallet.services';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
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
		setupTestnetsStore('reset');

		vi.spyOn(appConstants, 'LOCAL', 'get').mockImplementation(() => false);
	});

	it('should not initialize wallet workers when no addresses are available', () => {
		setupTestnetsStore('enabled');

		render(SolLoaderWallets);

		// With testnets enabled, we expect mainnet + testnet + devnet tokens
		expect(get(enabledSolanaTokens).length).toBe(3);
		expect(initSolWalletWorker).not.toHaveBeenCalled();
	});

	it('should initialize wallet workers only for networks with available addresses', () => {
		const testnetAddress = parseSolAddress('testnet-address');
		const mainnetAddress = parseSolAddress('mainnet-address');

		setupTestnetsStore('enabled');
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
		const devnetAddress = parseSolAddress('devnet-address');
		setupTestnetsStore('enabled');

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

	it('should handle all networks having addresses', () => {
		setupTestnetsStore('enabled');
		solAddressLocalnetStore.set({ data: parseSolAddress('local-address'), certified: true });
		solAddressTestnetStore.set({ data: parseSolAddress('testnet-address'), certified: true });
		solAddressDevnetStore.set({ data: parseSolAddress('devnet-address'), certified: true });
		solAddressMainnetStore.set({ data: parseSolAddress('mainnet-address'), certified: true });

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
		setupTestnetsStore('enabled');

		render(SolLoaderWallets);

		// With LOCAL true and testnets enabled, we expect mainnet + testnet + devnet + local tokens
		expect(get(enabledSolanaTokens).length).toBe(4);
	});
});
