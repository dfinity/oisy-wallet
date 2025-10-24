import NftPagesContext from '$lib/components/nfts/NftPagesContext.svelte';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { render, waitFor } from '@testing-library/svelte';

vi.mock('$lib/derived/network.derived', () => ({
	selectedNetwork: {
		subscribe: (fn: (v: any) => void) => {
			fn({ id: { description: 'mock-network' } });
			return () => {};
		}
	}
}));

const setOriginSelectedNetwork = vi.fn();
const subscribe = vi.fn(() => () => {});

vi.mock('$lib/stores/nft-pages.store', async (importOriginal) => {
	const actual = (await importOriginal()) as typeof import('$lib/stores/nft-pages.store');
	return {
		...actual,
		initNftPagesStore: vi.fn(() => ({
			subscribe,
			setOriginSelectedNetwork
		}))
	};
});

describe('NftPagesContext.svelte', () => {
	it('calls store.setOriginSelectedNetwork with selectedNetwork.id', async () => {
		render(NftPagesContext, { props: { children: mockSnippet } });

		// wait for the $effect to run
		await waitFor(() => {
			expect(setOriginSelectedNetwork).toHaveBeenCalledWith({ description: 'mock-network' });
		});
	});
});
