import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { CustomRpcProvider } from '$eth/providers/custom-rpc.providers';
import { ethProviders } from '$eth/providers/eth.providers';
import { InfuraProvider } from '$eth/providers/infura.providers';
import type { CustomEvmNetwork } from '$eth/types/custom-network';
import { parseNetworkId } from '$lib/validation/network.validation';
import { JsonRpcProvider } from 'ethers/providers';
import type { Writable, writable } from 'svelte/store';

const { customEvmNetworksStoreMock } = vi.hoisted(
	(): { customEvmNetworksStoreMock: Writable<CustomEvmNetwork[]> } => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const svelteStore = require('svelte/store') as { writable: typeof writable };
		return { customEvmNetworksStoreMock: svelteStore.writable<CustomEvmNetwork[]>([]) };
	}
);

vi.mock('$eth/stores/custom-evm-networks.store', () => ({
	customEvmNetworksStore: customEvmNetworksStoreMock
}));

vi.mock('$env/rest/infura.env', () => ({
	INFURA_API_KEY: 'test-api-key'
}));

const customNetworkId = parseNetworkId('custom-evm:10');

const buildCustomNetwork = (overrides: Partial<CustomEvmNetwork> = {}): CustomEvmNetwork => ({
	id: customNetworkId,
	chainId: 10n,
	name: 'Optimism',
	rpcUrl: 'https://mainnet.optimism.io',
	currencySymbol: 'ETH',
	env: 'mainnet',
	...overrides
});

describe('eth.providers', () => {
	const mockJsonRpcProvider = vi.mocked(JsonRpcProvider);
	const mockDestroy = vi.fn();

	beforeEach(() => {
		// The global `ethers/providers` mock in vitest.setup.ts substitutes
		// `JsonRpcProvider` with `vi.fn(class {})`, which has no instance
		// methods. When the `customEvmNetworksStore` subscription fires
		// `reconcileCache` during a store reset, it calls `destroy()` on any
		// cached `CustomRpcProvider` — which in turn calls the underlying
		// `JsonRpcProvider.destroy()`. Installing a stub here prevents a
		// TypeError bleeding across tests.
		mockJsonRpcProvider.prototype.destroy = mockDestroy;
		customEvmNetworksStoreMock.set([]);
	});

	describe('ethProviders', () => {
		it('returns a CustomRpcProvider for a network present in the custom store', () => {
			const network = buildCustomNetwork();
			customEvmNetworksStoreMock.set([network]);

			const provider = ethProviders(network.id);

			expect(provider).toBeInstanceOf(CustomRpcProvider);
		});

		it('returns an InfuraProvider for a built-in network not present in the custom store', () => {
			const provider = ethProviders(ETHEREUM_NETWORK_ID);

			expect(provider).toBeInstanceOf(InfuraProvider);
		});

		it('prefers the custom store when an id appears in both (custom wins)', () => {
			// Forge a custom entry that shadows a built-in id. This cannot happen
			// under the current id-derivation rules (`custom-evm:${chainId}` vs
			// the built-in symbolic ids), but the dispatcher must behave
			// deterministically if it ever does.
			const shadow = buildCustomNetwork({ id: ETHEREUM_NETWORK_ID });
			customEvmNetworksStoreMock.set([shadow]);

			const provider = ethProviders(ETHEREUM_NETWORK_ID);

			expect(provider).toBeInstanceOf(CustomRpcProvider);
		});

		it('throws for an unknown network id (falls through to infuraProviders)', () => {
			expect(() => ethProviders(ICP_NETWORK_ID)).toThrow();
		});

		it('returns the same CustomRpcProvider instance across calls (cache hit)', () => {
			const network = buildCustomNetwork();
			customEvmNetworksStoreMock.set([network]);

			const first = ethProviders(network.id);
			const second = ethProviders(network.id);

			expect(first).toBe(second);
		});

		it('re-resolves to Infura after a custom network is removed from the store', () => {
			// Edge: caller asks for a built-in id while a different custom entry
			// exists. Removing that custom entry must not affect the built-in path.
			customEvmNetworksStoreMock.set([buildCustomNetwork()]);
			const first = ethProviders(ETHEREUM_NETWORK_ID);

			customEvmNetworksStoreMock.set([]);
			const second = ethProviders(ETHEREUM_NETWORK_ID);

			expect(first).toBeInstanceOf(InfuraProvider);
			expect(second).toBeInstanceOf(InfuraProvider);
			// Infura map is module-level, so the same built-in id returns the
			// same instance across unrelated store mutations.
			expect(first).toBe(second);
		});
	});
});
