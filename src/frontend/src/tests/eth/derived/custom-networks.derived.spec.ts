import { enabledCustomEvmNetworks } from '$eth/derived/custom-networks.derived';
import type { CustomEvmNetwork } from '$eth/types/custom-network';
import { parseNetworkId } from '$lib/validation/network.validation';
import { get, type Writable, type writable } from 'svelte/store';

const { customEvmNetworksStoreMock, testnetsEnabledMock } = vi.hoisted(
	(): {
		customEvmNetworksStoreMock: Writable<CustomEvmNetwork[]>;
		testnetsEnabledMock: Writable<boolean>;
	} => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const svelteStore = require('svelte/store') as { writable: typeof writable };
		return {
			customEvmNetworksStoreMock: svelteStore.writable<CustomEvmNetwork[]>([]),
			testnetsEnabledMock: svelteStore.writable<boolean>(false)
		};
	}
);

vi.mock('$eth/stores/custom-evm-networks.store', () => ({
	customEvmNetworksStore: customEvmNetworksStoreMock
}));

vi.mock('$lib/derived/testnets.derived', () => ({
	testnetsEnabled: testnetsEnabledMock
}));

const buildCustomNetwork = (overrides: Partial<CustomEvmNetwork> = {}): CustomEvmNetwork => ({
	id: parseNetworkId(`custom-evm:${(overrides.chainId ?? 10n).toString()}`),
	chainId: 10n,
	name: 'Optimism',
	rpcUrl: 'https://mainnet.optimism.io',
	currencySymbol: 'ETH',
	explorerUrl: 'https://optimistic.etherscan.io',
	env: 'mainnet',
	...overrides
});

describe('custom-networks.derived', () => {
	beforeEach(() => {
		customEvmNetworksStoreMock.set([]);
		testnetsEnabledMock.set(false);
	});

	describe('enabledCustomEvmNetworks', () => {
		it('returns an empty list when the store is empty', () => {
			expect(get(enabledCustomEvmNetworks)).toEqual([]);
		});

		it('projects a mainnet custom network onto the Network shape, dropping EVM-specific fields', () => {
			const network = buildCustomNetwork({ iconUrl: 'https://op.example/logo.png' });
			customEvmNetworksStoreMock.set([network]);

			const [projected] = get(enabledCustomEvmNetworks);

			// Kept: id, name, env, explorerUrl, icon (from iconUrl)
			expect(projected).toEqual({
				id: network.id,
				name: 'Optimism',
				env: 'mainnet',
				explorerUrl: 'https://optimistic.etherscan.io',
				icon: 'https://op.example/logo.png'
			});
			// Dropped: the EVM-specific extras do not leak into the Network shape.
			expect(projected).not.toHaveProperty('chainId');
			expect(projected).not.toHaveProperty('rpcUrl');
			expect(projected).not.toHaveProperty('currencySymbol');
			expect(projected).not.toHaveProperty('iconUrl');
		});

		it('omits the icon property entirely when iconUrl is undefined', () => {
			// Explicit — NetworkSchema.icon is optional; the adapter must not
			// emit `icon: undefined` because downstream consumers distinguish
			// "field absent" from "field present and undefined".
			customEvmNetworksStoreMock.set([buildCustomNetwork()]);

			const [projected] = get(enabledCustomEvmNetworks);

			expect('icon' in projected).toBeFalsy();
		});

		it('hides testnet entries when testnetsEnabled is false', () => {
			const main = buildCustomNetwork({ chainId: 10n, name: 'Optimism', env: 'mainnet' });
			const test = buildCustomNetwork({
				chainId: 11155420n,
				name: 'Optimism Sepolia',
				env: 'testnet'
			});
			customEvmNetworksStoreMock.set([main, test]);

			const names = get(enabledCustomEvmNetworks).map(({ name }) => name);

			expect(names).toEqual(['Optimism']);
		});

		it('surfaces testnet entries when testnetsEnabled flips to true', () => {
			const main = buildCustomNetwork({ chainId: 10n, name: 'Optimism', env: 'mainnet' });
			const test = buildCustomNetwork({
				chainId: 11155420n,
				name: 'Optimism Sepolia',
				env: 'testnet'
			});
			customEvmNetworksStoreMock.set([main, test]);

			testnetsEnabledMock.set(true);

			const names = get(enabledCustomEvmNetworks).map(({ name }) => name);

			expect(names).toEqual(['Optimism', 'Optimism Sepolia']);
		});

		it('preserves insertion order from the store', () => {
			// Guard against an accidental sort inside the adapter — the UI
			// relies on the store order to reflect the add sequence.
			const a = buildCustomNetwork({ chainId: 10n, name: 'A' });
			const b = buildCustomNetwork({ chainId: 100n, name: 'B' });
			const c = buildCustomNetwork({ chainId: 1000n, name: 'C' });
			customEvmNetworksStoreMock.set([c, a, b]);

			const names = get(enabledCustomEvmNetworks).map(({ name }) => name);

			expect(names).toEqual(['C', 'A', 'B']);
		});

		it('is reactive: adding a network updates the derived list', () => {
			customEvmNetworksStoreMock.set([buildCustomNetwork({ chainId: 10n, name: 'Optimism' })]);
			const namesBefore = get(enabledCustomEvmNetworks).map(({ name }) => name);

			expect(namesBefore).toEqual(['Optimism']);

			customEvmNetworksStoreMock.update((current) => [
				...current,
				buildCustomNetwork({ chainId: 100n, name: 'Gnosis' })
			]);
			const namesAfter = get(enabledCustomEvmNetworks).map(({ name }) => name);

			expect(namesAfter).toEqual(['Optimism', 'Gnosis']);
		});
	});
});
