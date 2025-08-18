import NftHero from '$lib/components/nfts/NftHero.svelte';
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

		const name: HTMLElement | null = getByText(mockValidErc1155Nft.name);

		expect(name).toBeInTheDocument();

		const standard: HTMLElement | null = getByText(mockNftollectionUi.collection.standard);

		expect(standard).toBeInTheDocument();

		const address: HTMLElement | null = getByText(mockNftollectionUi.collection.address);

		expect(address).toBeInTheDocument();

		const network: HTMLElement | null = getByText(mockNftollectionUi.collection.network.name);

		expect(network).toBeInTheDocument();

		for (let attr in mockValidErc1155Nft.attributes) {
			const attrEl: HTMLElement | null = getByText(attr);

			expect(attrEl).toBeInTheDocument();
		}
	});

	it('should render the nft image in the banner', () => {
		const { container } = render(NftHero, {
			props: {
				nft: mockValidErc1155Nft
			}
		});

		const parent = container.querySelector('.h-64');

		assertNonNullish(parent);

		const imageElement: HTMLDivElement | null = parent.querySelector('div');

		assertNonNullish(imageElement);

		expect(imageElement.getAttribute('style')).toContain(
			`background-image: url("${mockNftollectionUi.nfts[0].imageUrl}")`
		);
	});
});
