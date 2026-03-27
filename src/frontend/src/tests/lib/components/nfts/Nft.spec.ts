import Nft from '$lib/components/nfts/Nft.svelte';
import { nftStore } from '$lib/stores/nft.store';
import { parseNftId } from '$lib/validation/nft.validation';
import { mockValidErc1155Nft } from '$tests/mocks/nfts.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('Nft', () => {
	const mockNft = { ...mockValidErc1155Nft, name: 'Test NFT', id: parseNftId('1') };

	beforeAll(() => {
		nftStore.addAll([mockNft]);

		mockPage.mockNft(mockNft);
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
