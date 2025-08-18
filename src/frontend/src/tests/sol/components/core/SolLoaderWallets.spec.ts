import { SOLANA_DEVNET_TOKEN, SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import * as appConstants from '$lib/constants/app.constants';
import {
	solAddressDevnetStore,
	solAddressLocalnetStore,
	solAddressMainnetStore
} from '$lib/stores/address.store';
import SolLoaderWallets from '$sol/components/core/SolLoaderWallets.svelte';
import { enabledSolanaTokens } from '$sol/derived/tokens.derived';
import { initSolWalletWorker } from '$sol/services/worker.sol-wallet.services';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock('$sol/services/worker.sol-wallet.services', () => ({
	initSolWalletWorker: vi.fn()
}));

describe('SolLoaderWallets', () => {
	const mockSnippet = createMockSnippet('Mock Snippet');

	beforeEach(() => {
		vi.clearAllMocks();

		// Reset all address stores
		solAddressLocalnetStore.reset();
		solAddressDevnetStore.reset();
		solAddressMainnetStore.reset();

		setupTestnetsStore('enabled');
		setupUserNetworksStore('allEnabled');

		vi.spyOn(appConstants, 'LOCAL', 'get').mockImplementation(() => false);
	});

	it('should not initialize wallet workers when no addresses are available', () => {
		render(SolLoaderWallets, { children: mockSnippet });

		// With testnets enabled, we expect mainnet + devnet tokens
		expect(get(enabledSolanaTokens)).toHaveLength(2);
		expect(initSolWalletWorker).not.toHaveBeenCalled();
	});

	it('should initialize wallet workers only for networks with available addresses', () => {
		const devnetAddress = 'devnet-address';
		const mainnetAddress = 'mainnet-address';

		solAddressDevnetStore.set({ data: devnetAddress, certified: true });
		solAddressMainnetStore.set({ data: mainnetAddress, certified: true });

		render(SolLoaderWallets, { children: mockSnippet });

		const walletWorkerTokens = get(enabledSolanaTokens).filter(
			({ network: { id: networkId } }) =>
				(networkId === SOLANA_DEVNET_TOKEN.network.id && devnetAddress) ||
				(networkId === SOLANA_TOKEN.network.id && mainnetAddress)
		);

		expect(walletWorkerTokens).toHaveLength(2);
	});

	it('should update wallet workers when addresses change', async () => {
		const devnetAddress = 'devnet-address';

		const { rerender } = render(SolLoaderWallets, { children: mockSnippet });

		expect(initSolWalletWorker).not.toHaveBeenCalled();

		solAddressDevnetStore.set({ data: devnetAddress, certified: true });
		await rerender({});

		const walletWorkerTokens = get(enabledSolanaTokens).filter(
			({ network: { id: networkId } }) =>
				networkId === SOLANA_DEVNET_TOKEN.network.id && devnetAddress
		);

		expect(walletWorkerTokens).toHaveLength(1);
	});

	it('should handle all networks having addresses', () => {
		solAddressLocalnetStore.set({ data: 'local-address', certified: true });
		solAddressDevnetStore.set({ data: 'devnet-address', certified: true });
		solAddressMainnetStore.set({ data: 'mainnet-address', certified: true });

		render(SolLoaderWallets, { children: mockSnippet });

		const walletWorkerTokens = get(enabledSolanaTokens).filter(
			({ network: { id: networkId } }) =>
				networkId === SOLANA_TOKEN.network.id || networkId === SOLANA_DEVNET_TOKEN.network.id
		);

		expect(walletWorkerTokens).toHaveLength(2);
	});

	it('should include local network token when LOCAL is true', () => {
		vi.spyOn(appConstants, 'LOCAL', 'get').mockImplementation(() => true);

		render(SolLoaderWallets, { children: mockSnippet });

		// With LOCAL true and testnets enabled, we expect mainnet + devnet + local tokens
		expect(get(enabledSolanaTokens)).toHaveLength(3);
	});
});
