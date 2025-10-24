import NftPagesContext from '$lib/components/nfts/NftPagesContext.svelte';
import { NFT_PAGES_CONTEXT_KEY } from '$lib/stores/nft-pages.store';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { render } from '@testing-library/svelte';

// Mock selectedNetwork derived store
vi.mock('$lib/derived/network.derived', () => ({
	selectedNetwork: {
		subscribe: (fn: (v: any) => void) => {
			fn({ id: { description: 'mock-network' } });
			return () => {};
		}
	}
}));

const mockContext = (store: any) => new Map([[NFT_PAGES_CONTEXT_KEY, { store }]]);

describe('NftPagesContext.svelte', () => {
	it('calls store.setOriginSelectedNetwork with selectedNetwork.id', async () => {
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
