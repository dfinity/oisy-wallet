import Nft from '$lib/components/nfts/Nft.svelte';
import { nftStore } from '$lib/stores/nft.store';
import { parseNftId } from '$lib/validation/nft.validation';
import { mockValidErc1155Nft } from '$tests/mocks/nfts.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('Nft', () => {
	beforeAll(() => {
		nftStore.addAll([{ ...mockValidErc1155Nft, name: 'Test NFT', id: parseNftId(1) }]);

		mockPage.mockDynamicRoutes({
			networkId: mockValidErc1155Nft.collection.network.name,
			collectionId: mockValidErc1155Nft.collection.address,
			nftId: String(mockValidErc1155Nft.id)
		});
	});

	it('should render the nft', () => {
		const { container, getByText } = render(Nft);

		const name: HTMLElement | null = getByText(`Test NFT #1`);

		expect(name).toBeInTheDocument();

		const imageElement: HTMLImageElement | null = container.querySelector('img');

		assertNonNullish(imageElement);

		expect(imageElement.getAttribute('src')).toContain(mockValidErc1155Nft.imageUrl);
	});
});
