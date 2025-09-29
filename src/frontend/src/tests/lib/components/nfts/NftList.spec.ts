import { AppPath } from '$lib/constants/routes.constants';
import { parseNftId } from '$lib/validation/nft.validation';
import { mockValidErc1155Nft } from '$tests/mocks/nfts.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';
import NftListTestHost from './NftListTestHost.svelte';

describe('NftList', () => {
	const mockNfts = [
		{ ...mockValidErc1155Nft, name: 'Null', id: parseNftId(0) },
		{ ...mockValidErc1155Nft, name: 'Eins', id: parseNftId(1) },
		{ ...mockValidErc1155Nft, name: 'Zwei', id: parseNftId(2) }
	];

	it('should render a list of nfts', () => {
		const title = 'Nfts';

		const { container, getByText } = render(NftListTestHost, {
			props: {
				title,
				nfts: mockNfts
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

			const img = links.item(i).querySelector('.bg-secondary-alt');

			assertNonNullish(img);
		}
	});
});
