import { mockValidErc1155Nft } from '$tests/mocks/nfts.mock';
import { assertNonNullish } from '@dfinity/utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { render } from '@testing-library/svelte';
import NftCollectionList from '$lib/components/nfts/NftCollectionList.svelte';
import type { NftCollectionUi } from '$lib/types/nft';
import { AppPath } from '$lib/constants/routes.constants';

describe('NftsCollectionList', () => {
	const mockNfts = [
		{ ...mockValidErc1155Nft, name: 'Null', id: parseNftId(0) },
		{ ...mockValidErc1155Nft, name: 'Eins', id: parseNftId(1) },
		{ ...mockValidErc1155Nft, name: 'Zwei', id: parseNftId(2) }
	];

	const mockCollections: NftCollectionUi[] = [
		{collection: mockNfts[0].collection, nfts: mockNfts},
		{collection: mockNfts[1].collection, nfts: mockNfts},
	]

	it('should render a list of collections', () => {
		const title = 'Collections';

		const { container, getByText } = render(NftCollectionList, {
			props: {
				title,
				nftCollections: mockCollections
			}
		});

		expect(getByText(title)).toBeInTheDocument();

		const grid = container.querySelector('.grid');

		assertNonNullish(grid);

		const links = grid.querySelectorAll('a');

		assertNonNullish(links);

		for (let i = 0; i < links.length; i++) {
			expect(links.item(i).getAttribute('href')).toContain(
				`${AppPath.Nfts}${mockValidErc1155Nft.collection.network.name}-${mockValidErc1155Nft.collection.address}`
			);

			const img = links.item(i).querySelector('.bg-cover');

			assertNonNullish(img);

			expect(img.getAttribute('style')).toContain(
				`background-image: url("${mockNfts[i].imageUrl}")`
			);
		}
	});
});