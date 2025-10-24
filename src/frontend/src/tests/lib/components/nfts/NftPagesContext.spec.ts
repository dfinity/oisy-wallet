import NftPagesContext from '$lib/components/nfts/NftPagesContext.svelte';
import { NFT_PAGES_CONTEXT_KEY, type NftPagesStore } from '$lib/stores/nft-pages.store';
import type { NetworkId } from '$lib/types/network';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';

// Mock selectedNetwork derived store
vi.mock('$lib/derived/network.derived', () => ({
	selectedNetwork: {
		subscribe: (fn: (v: NetworkId) => void) => {
			fn({ id: { description: 'mock-network' } } as unknown as NetworkId);
			return () => {};
		}
	}
}));

const mockContext = (store: NftPagesStore) => new Map([[NFT_PAGES_CONTEXT_KEY, { store }]]);

describe('NftPagesContext.svelte', () => {
	it('calls store.setOriginSelectedNetwork with selectedNetwork.id', () => {
		const setOriginSelectedNetwork = vi.fn();

		const mockStore = {
			subscribe: vi.fn(),
			setOriginSelectedNetwork
		};

		render(NftPagesContext, {
			context: mockContext(mockStore),
			props: { children: mockSnippet }
		});

		expect(setOriginSelectedNetwork).toHaveBeenCalledWith({ description: 'mock-network' });
	});
});
