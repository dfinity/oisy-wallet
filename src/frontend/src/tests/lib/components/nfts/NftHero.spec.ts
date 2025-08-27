import NftHero from '$lib/components/nfts/NftHero.svelte';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { mockNftollectionUi, mockValidErc1155Nft } from '$tests/mocks/nfts.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('NftHero', () => {
	it('should render the nft data', () => {
		const { getByText } = render(NftHero, {
			props: {
				nft: mockValidErc1155Nft
			}
		});

		assertNonNullish(mockValidErc1155Nft.name);

		const name: HTMLElement | null = getByText(
			`${mockValidErc1155Nft.name} #${String(mockValidErc1155Nft.id)}`
		);

		expect(name).toBeInTheDocument();

		const standard: HTMLElement | null = getByText(mockNftollectionUi.collection.standard);

		expect(standard).toBeInTheDocument();

		const address: HTMLElement | null = getByText(
			shortenWithMiddleEllipsis({ text: mockNftollectionUi.collection.address })
		);

		expect(address).toBeInTheDocument();

		const network: HTMLElement | null = getByText(mockNftollectionUi.collection.network.name);

		expect(network).toBeInTheDocument();

		mockValidErc1155Nft.attributes?.forEach((attr) => {
			const attrTypeEl: HTMLElement | null = getByText(attr.traitType);

			expect(attrTypeEl).toBeInTheDocument();

			const attrValEl: HTMLElement | null = getByText(attr.value);

			expect(attrValEl).toBeInTheDocument();
		});
	});

	it('should render the nft image in the banner', () => {
		const { container } = render(NftHero, {
			props: {
				nft: mockValidErc1155Nft
			}
		});

		const imageElement: HTMLImageElement | null = container.querySelector('img');

		assertNonNullish(imageElement);

		expect(imageElement.getAttribute('src')).toContain(mockValidErc1155Nft.imageUrl);
	});
});
