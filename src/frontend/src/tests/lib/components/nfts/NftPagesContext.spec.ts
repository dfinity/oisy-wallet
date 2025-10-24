import NftPagesContext from '$lib/components/nfts/NftPagesContext.svelte';
import type * as NftPagesStoreModule from '$lib/stores/nft-pages.store';
import type { NetworkId, OptionNetworkId } from '$lib/types/network';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { render, waitFor } from '@testing-library/svelte';

vi.mock('$lib/derived/network.derived', () => ({
	selectedNetwork: {
		subscribe: (fn: (v: OptionNetworkId) => void) => {
			fn({ id: { description: 'mock-network' } } as unknown as NetworkId);
			return () => {};
		}
	}
}));

const setOriginSelectedNetwork = vi.fn();
const subscribe = vi.fn(() => () => {});

vi.mock('$lib/stores/nft-pages.store', async (importOriginal) => {
	//
	const actual = (await importOriginal()) as typeof NftPagesStoreModule;
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
