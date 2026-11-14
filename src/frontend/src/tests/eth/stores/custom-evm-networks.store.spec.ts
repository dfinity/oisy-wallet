import {
	CUSTOM_EVM_NETWORKS_STORAGE_KEY,
	initCustomEvmNetworksStore,
	type CustomEvmNetworkInput
} from '$eth/stores/custom-evm-networks.store';
import type { PersistedCustomEvmNetwork } from '$eth/types/custom-network';
import { ZERO } from '$lib/constants/app.constants';
import { del as delStorage, get as getStorage, set as setStorage } from '$lib/utils/storage.utils';
import { get } from 'svelte/store';

vi.mock('$lib/utils/storage.utils', () => ({
	set: vi.fn(),
	get: vi.fn(),
	del: vi.fn()
}));

describe('custom-evm-networks.store', () => {
	const optimism: CustomEvmNetworkInput = {
		chainId: 10n,
		name: 'Optimism',
		rpcUrl: 'https://mainnet.optimism.io',
		currencySymbol: 'ETH',
		explorerUrl: 'https://optimistic.etherscan.io',
		env: 'mainnet'
	};

	const gnosis: CustomEvmNetworkInput = {
		chainId: 100n,
		name: 'Gnosis',
		rpcUrl: 'https://rpc.gnosischain.com',
		currencySymbol: 'xDAI',
		env: 'mainnet'
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getStorage).mockImplementation(() => undefined);
	});

	describe('initialization', () => {
		it('starts empty when storage has no record', () => {
			const store = initCustomEvmNetworksStore();

			expect(get(store)).toEqual([]);
		});

		it('hydrates from persisted storage', () => {
			const persisted: PersistedCustomEvmNetwork[] = [
				{
					chainId: '10',
					name: 'Optimism',
					rpcUrl: 'https://mainnet.optimism.io',
					currencySymbol: 'ETH',
					explorerUrl: 'https://optimistic.etherscan.io',
					env: 'mainnet'
				}
			];
			vi.mocked(getStorage).mockImplementation(() => persisted);

			const store = initCustomEvmNetworksStore();
			const list = get(store);

			expect(list).toHaveLength(1);
			expect(list[0].chainId).toBe(10n);
			expect(list[0].name).toBe('Optimism');
			expect(typeof list[0].id).toBe('symbol');
		});

		it('returns empty list when persisted storage is malformed', () => {
			vi.mocked(getStorage).mockImplementation(() => ({ not: 'an array' }));

			const store = initCustomEvmNetworksStore();

			expect(get(store)).toEqual([]);
		});

		it('returns empty list when a persisted entry fails schema validation', () => {
			vi.mocked(getStorage).mockImplementation(() => [
				{
					chainId: 'not-a-number',
					name: 'Bogus',
					rpcUrl: 'https://bogus.example',
					currencySymbol: 'BOG',
					env: 'mainnet'
				}
			]);

			const store = initCustomEvmNetworksStore();

			expect(get(store)).toEqual([]);
		});

		it('dedupes persisted entries with the same chainId, keeping the first', () => {
			vi.mocked(getStorage).mockImplementation(() => [
				{
					chainId: '10',
					name: 'Optimism',
					rpcUrl: 'https://mainnet.optimism.io',
					currencySymbol: 'ETH',
					env: 'mainnet'
				},
				{
					chainId: '10',
					name: 'Optimism duplicate',
					rpcUrl: 'https://other.example',
					currencySymbol: 'ETH',
					env: 'mainnet'
				}
			]);

			const list = get(initCustomEvmNetworksStore());

			expect(list).toHaveLength(1);
			expect(list[0].name).toBe('Optimism');
		});

		it('derives the same NetworkId symbol for the same chainId across reloads', () => {
			vi.mocked(getStorage).mockImplementation(() => [
				{
					chainId: '10',
					name: 'Optimism',
					rpcUrl: 'https://mainnet.optimism.io',
					currencySymbol: 'ETH',
					env: 'mainnet'
				}
			]);

			const firstId = get(initCustomEvmNetworksStore())[0].id;
			const secondId = get(initCustomEvmNetworksStore())[0].id;

			expect(firstId).toBe(secondId);
		});
	});

	describe('add', () => {
		it('appends a network and derives a NetworkId symbol', () => {
			const store = initCustomEvmNetworksStore();

			store.add(optimism);

			const list = get(store);

			expect(list).toHaveLength(1);
			expect(list[0].chainId).toBe(10n);
			expect(typeof list[0].id).toBe('symbol');
		});

		it('persists to localStorage in serialized form', () => {
			const store = initCustomEvmNetworksStore();

			store.add(optimism);

			expect(setStorage).toHaveBeenCalledExactlyOnceWith({
				key: CUSTOM_EVM_NETWORKS_STORAGE_KEY,
				value: [
					{
						chainId: '10',
						name: 'Optimism',
						rpcUrl: 'https://mainnet.optimism.io',
						currencySymbol: 'ETH',
						explorerUrl: 'https://optimistic.etherscan.io',
						iconUrl: undefined,
						env: 'mainnet'
					}
				]
			});
		});

		it('rejects a duplicate chainId', () => {
			const store = initCustomEvmNetworksStore();

			store.add(optimism);

			expect(() => store.add(optimism)).toThrow(/already been added/);
			expect(get(store)).toHaveLength(1);
		});

		it('rejects input that fails schema validation and does not persist', () => {
			const store = initCustomEvmNetworksStore();

			expect(() => store.add({ ...optimism, name: '' })).toThrow(/Invalid custom EVM network/);
			expect(get(store)).toEqual([]);
			expect(setStorage).not.toHaveBeenCalled();
		});

		it('rejects an rpcUrl with a non-https/wss protocol', () => {
			const store = initCustomEvmNetworksStore();

			expect(() => store.add({ ...optimism, rpcUrl: 'ipfs://bafybeigdyrzt/' })).toThrow(
				/Invalid custom EVM network/
			);
			expect(get(store)).toEqual([]);
		});

		it('rejects invalid chainId before deriving a NetworkId', () => {
			const store = initCustomEvmNetworksStore();

			expect(() => store.add({ ...optimism, chainId: ZERO })).toThrow(/Invalid custom EVM network/);
			expect(get(store)).toEqual([]);
		});

		it('strips unknown caller-supplied properties', () => {
			const store = initCustomEvmNetworksStore();

			store.add({ ...optimism, junk: 'ignored' } as CustomEvmNetworkInput);

			expect(get(store)[0]).not.toHaveProperty('junk');
		});

		it('supports multiple distinct chains', () => {
			const store = initCustomEvmNetworksStore();

			store.add(optimism);
			store.add(gnosis);

			const list = get(store);

			expect(list.map((n) => n.chainId)).toEqual([10n, 100n]);
		});
	});

	describe('update', () => {
		it('replaces only the patched fields and persists', () => {
			const store = initCustomEvmNetworksStore();
			store.add(optimism);
			vi.mocked(setStorage).mockClear();

			store.update({
				chainId: 10n,
				patch: { name: 'Optimism (edited)', rpcUrl: 'https://op.example' }
			});

			const [network] = get(store);

			expect(network.name).toBe('Optimism (edited)');
			expect(network.rpcUrl).toBe('https://op.example');
			expect(network.currencySymbol).toBe('ETH');
			expect(setStorage).toHaveBeenCalledExactlyOnceWith({
				key: CUSTOM_EVM_NETWORKS_STORAGE_KEY,
				value: [
					{
						chainId: '10',
						name: 'Optimism (edited)',
						rpcUrl: 'https://op.example',
						currencySymbol: 'ETH',
						explorerUrl: 'https://optimistic.etherscan.io',
						iconUrl: undefined,
						env: 'mainnet'
					}
				]
			});
		});

		it('throws when the chainId is not in the store', () => {
			const store = initCustomEvmNetworksStore();

			expect(() => store.update({ chainId: 999n, patch: { name: 'x' } })).toThrow(/cannot update/);
		});

		it('preserves id and chainId even if a caller tries to override them', () => {
			const store = initCustomEvmNetworksStore();
			store.add(optimism);
			const originalId = get(store)[0].id;

			store.update({
				chainId: 10n,
				patch: { id: Symbol('hacked'), chainId: 99n, name: 'renamed' } as never
			});

			const [network] = get(store);

			expect(network.id).toBe(originalId);
			expect(network.chainId).toBe(10n);
			expect(network.name).toBe('renamed');
		});
	});

	describe('remove', () => {
		it('removes the matching network and persists', () => {
			const store = initCustomEvmNetworksStore();
			store.add(optimism);
			store.add(gnosis);
			vi.mocked(setStorage).mockClear();

			store.remove({ chainId: 10n });

			expect(get(store).map((n) => n.chainId)).toEqual([100n]);
			expect(setStorage).toHaveBeenCalledExactlyOnceWith({
				key: CUSTOM_EVM_NETWORKS_STORAGE_KEY,
				value: [
					{
						chainId: '100',
						name: 'Gnosis',
						rpcUrl: 'https://rpc.gnosischain.com',
						currencySymbol: 'xDAI',
						explorerUrl: undefined,
						iconUrl: undefined,
						env: 'mainnet'
					}
				]
			});
		});

		it('is a no-op when the chainId is not present', () => {
			const store = initCustomEvmNetworksStore();
			store.add(optimism);
			vi.mocked(setStorage).mockClear();

			store.remove({ chainId: 999n });

			expect(get(store)).toHaveLength(1);
			expect(setStorage).not.toHaveBeenCalled();
		});
	});

	describe('reset', () => {
		it('clears the store and deletes the storage key', () => {
			const store = initCustomEvmNetworksStore();
			store.add(optimism);

			store.reset();

			expect(get(store)).toEqual([]);
			expect(delStorage).toHaveBeenCalledExactlyOnceWith({
				key: CUSTOM_EVM_NETWORKS_STORAGE_KEY
			});
		});
	});
});
