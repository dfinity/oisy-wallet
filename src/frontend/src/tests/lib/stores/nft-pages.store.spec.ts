import { TokenTypes } from '$lib/enums/token-types';
import { initNftPagesStore } from '$lib/stores/nft-pages.store';
import type { NetworkId } from '$lib/types/network';
import { get } from 'svelte/store';

describe('nft-pages.store', () => {
	it('initializes with originSelectedNetwork and assetsTab undefined', () => {
		const store = initNftPagesStore();

		expect(get(store)).toEqual({ originSelectedNetwork: undefined, assetsTab: undefined });
	});

	it('updates originSelectedNetwork when setOriginSelectedNetwork is called', () => {
		const store = initNftPagesStore();

		const mockNetworkId = { description: 'network-123' } as unknown as NetworkId;
		store.setOriginSelectedNetwork(mockNetworkId);

		expect(get(store)?.originSelectedNetwork).toEqual(mockNetworkId);
	});

	it('updates assetsTab when setAssetsTab is called', () => {
		const store = initNftPagesStore();

		store.setAssetsTab(TokenTypes.TOKENS);

		expect(get(store)?.assetsTab).toEqual(TokenTypes.TOKENS);
	});

	it('provides derived store for originSelectedNetwork', () => {
		const store = initNftPagesStore();

		const mockNetworkId = { description: 'network-123' } as unknown as NetworkId;
		store.setOriginSelectedNetwork(mockNetworkId);

		expect(get(store.originSelectedNetwork)).toBe(mockNetworkId);
	});

	it('provides derived store for assetsTab', () => {
		const store = initNftPagesStore();

		store.setAssetsTab(TokenTypes.NFTS);

		expect(get(store.assetsTab)).toBe(TokenTypes.NFTS);
	});
});
