import NftCollection from '$lib/components/nfts/NftCollection.svelte';
import { nftStore } from '$lib/stores/nft.store';
import { parseNftId } from '$lib/validation/nft.validation';
import { mockValidErc1155Nft } from '$tests/mocks/nfts.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('NftCollection', () => {
	const mockNfts = [
		{ ...mockValidErc1155Nft, name: 'Null', id: parseNftId(0) },
		{ ...mockValidErc1155Nft, name: 'Eins', id: parseNftId(1) },
		{ ...mockValidErc1155Nft, name: 'Zwei', id: parseNftId(2) }
	];

	beforeAll(() => {
		nftStore.addAll(mockNfts);

		mockPage.mockNftCollection(mockValidErc1155Nft.collection.address);
	});

	it('should render the nft', () => {
		const { container } = render(NftCollection);

		const grid = container.querySelector('.grid');

		assertNonNullish(grid);

		const links = grid.querySelectorAll('a');
	});
});
