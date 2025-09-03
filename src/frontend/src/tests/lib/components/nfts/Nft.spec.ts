import Nft from '$lib/components/nfts/Nft.svelte';
import { nftStore } from '$lib/stores/nft.store';
import * as nftsUtils from '$lib/utils/nfts.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { mockValidErc1155Nft } from '$tests/mocks/nfts.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('Nft', () => {
	const mockNft = { ...mockValidErc1155Nft, name: 'Test NFT', id: parseNftId(1) };

	beforeAll(() => {
		nftStore.addAll([mockNft]);

		mockPage.mockDynamicRoutes({
			networkId: mockValidErc1155Nft.collection.network.name,
			collectionId: mockValidErc1155Nft.collection.address,
			nftId: String(mockNft.id)
		});

		vi.spyOn(nftsUtils, 'getAllowMediaForNft').mockReturnValue(true);
	});

	it('should render the nft', () => {
		const { container, getByText } = render(Nft);

		const name: HTMLElement | null = getByText(`${mockNft.name} #${mockNft.id}`);

		expect(name).toBeInTheDocument();

		const imageElement: HTMLImageElement | null = container.querySelector('img');

		assertNonNullish(imageElement);

		expect(imageElement.getAttribute('src')).toContain(mockNft.imageUrl);
	});
});
