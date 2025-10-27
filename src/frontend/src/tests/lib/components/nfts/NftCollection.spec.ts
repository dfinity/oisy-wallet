import NftCollection from '$lib/components/nfts/NftCollection.svelte';
import { AppPath } from '$lib/constants/routes.constants';
import { NFT_PAGES_CONTEXT_KEY } from '$lib/stores/nft-pages.store';
import { nftStore } from '$lib/stores/nft.store';
import type { OptionNetworkId } from '$lib/types/network';
import { parseNftId } from '$lib/validation/nft.validation';
import { mockValidErc1155Nft } from '$tests/mocks/nfts.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';
import * as svelte from 'svelte';
import { writable } from 'svelte/store';

const createMockNftPagesStore = (originSelectedNetwork: OptionNetworkId) => {
	const { subscribe, set } = writable({
		assetsTab: undefined,
		originSelectedNetwork
	});
	return {
		subscribe,
		setAssetsTab: vi.fn(),
		setOriginSelectedNetwork: vi.fn(),
		set
	};
};

const originalGetContext = svelte.getContext;

vi.spyOn(svelte, 'getContext').mockImplementation((key) =>
	key === NFT_PAGES_CONTEXT_KEY ? createMockNftPagesStore(undefined) : originalGetContext(key)
);

describe('NftCollection', () => {
	const mockNfts = [
		{ ...mockValidErc1155Nft, name: 'Null', id: parseNftId('0') },
		{ ...mockValidErc1155Nft, name: 'Eins', id: parseNftId('1') },
		{ ...mockValidErc1155Nft, name: 'Zwei', id: parseNftId('2') }
	];

	beforeAll(() => {
		vi.clearAllMocks();

		nftStore.addAll(mockNfts);

		mockPage.mock({
			network: mockValidErc1155Nft.collection.network.id.description,
			collection: mockValidErc1155Nft.collection.address
		});
	});

	it('should render a list of the collections nfts', () => {
		const { container } = render(NftCollection);

		const grid = container.querySelector('.grid');

		assertNonNullish(grid);

		const links = grid.querySelectorAll('a');

		assertNonNullish(links);

		for (let i = 0; i < links.length; i++) {
			expect(links.item(i).getAttribute('href')).toContain(
				`${AppPath.Nfts}${mockValidErc1155Nft.collection.network.name}-${mockValidErc1155Nft.collection.address}/${mockNfts[i].id}`
			);

			const img = links.item(i).querySelector('.bg-cover');

			assertNonNullish(img);

			expect(img.getAttribute('style')).toContain(
				`background-image: url("${mockNfts[i].imageUrl}")`
			);
		}
	});
});
