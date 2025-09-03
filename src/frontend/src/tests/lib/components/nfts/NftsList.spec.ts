import NftsList from '$lib/components/nfts/NftsList.svelte';
import { AppPath } from '$lib/constants/routes.constants';
import * as networkTokens from '$lib/derived/network-tokens.derived';
import * as tokens from '$lib/derived/tokens.derived';
import { i18n } from '$lib/stores/i18n.store';
import { nftStore } from '$lib/stores/nft.store';
import * as nftsUtils from '$lib/utils/nfts.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import {
	mockNonFungibleToken1,
	mockNonFungibleToken2,
	mockValidErc1155Nft
} from '$tests/mocks/nfts.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';
import { get, writable } from 'svelte/store';

describe('NftsList', () => {
	const mockNfts = [
		{ ...mockValidErc1155Nft, name: 'Null', id: parseNftId(0) },
		{ ...mockValidErc1155Nft, name: 'Eins', id: parseNftId(1) },
		{ ...mockValidErc1155Nft, name: 'Zwei', id: parseNftId(2) }
	];

	beforeAll(() => {
		vi.spyOn(nftsUtils, 'getAllowMediaForNft').mockReturnValue(true);
	});

	beforeEach(() => {
		nftStore.resetAll();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should render a list of the collections', () => {
		nftStore.addAll(mockNfts);

		vi.spyOn(networkTokens, 'enabledNonFungibleNetworkTokens', 'get').mockReturnValue(
			writable([mockNonFungibleToken1, mockNonFungibleToken2])
		);
		vi.spyOn(tokens, 'nonFungibleTokens', 'get').mockReturnValue(
			writable([mockNonFungibleToken1, mockNonFungibleToken2])
		);

		const { container } = render(NftsList);

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

	it('should render a placeholder if no collections', () => {
		const { getByText } = render(NftsList);

		const h5 = getByText(get(i18n).nfts.text.title_empty);

		assertNonNullish(h5);

		expect(h5).toBeInTheDocument();
	});
});
