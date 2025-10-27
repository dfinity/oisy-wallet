import { TokenTypes } from '$lib/enums/token-types';
import { navStore } from '$lib/stores/nav.store';
import type { NetworkId } from '$lib/types/network';
import { get } from 'svelte/store';

describe('nav.store', () => {
	it('initializes with originSelectedNetwork and assetsTab undefined', () => {
		expect(get(navStore)).toEqual({ userSelectedNetwork: undefined, selectedAssetsTab: undefined });
	});

	it('updates userSelectedNetwork when setUserSelectedNetwork is called', () => {
		const mockNetworkId = { description: 'network-123' } as unknown as NetworkId;
		navStore.setUserSelectedNetwork(mockNetworkId);

		expect(get(navStore)?.userSelectedNetwork).toEqual(mockNetworkId.description);
	});

	it('updates selectedAssetsTab when setSelectedAssetsTab is called', () => {
		navStore.setActiveAssetsTab(TokenTypes.TOKENS);

		expect(get(navStore)?.activeAssetsTab).toEqual(TokenTypes.TOKENS);
	});
});
