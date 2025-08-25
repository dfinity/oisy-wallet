import NftCollectionHero from '$lib/components/nfts/NftCollectionHero.svelte';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { mockNftollectionUi } from '$tests/mocks/nfts.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('NftCollectionHero', () => {
	it('should render the collection data', () => {
		const { getByText } = render(NftCollectionHero, {
			props: {
				nfts: mockNftollectionUi.nfts,
				collection: mockNftollectionUi.collection
			}
		});

		assertNonNullish(mockNftollectionUi.collection.name);

		const name: HTMLElement | null = getByText(mockNftollectionUi.collection.name);

		expect(name).toBeInTheDocument();

		const standard: HTMLElement | null = getByText(mockNftollectionUi.collection.standard);

		expect(standard).toBeInTheDocument();

		const address: HTMLElement | null = getByText(
			shortenWithMiddleEllipsis({ text: mockNftollectionUi.collection.address })
		);

		expect(address).toBeInTheDocument();

		const network: HTMLElement | null = getByText(mockNftollectionUi.collection.network.name);

		expect(network).toBeInTheDocument();
	});

	it('should render the collections first nft image as a banner', () => {
		const { container } = render(NftCollectionHero, {
			props: {
				nfts: mockNftollectionUi.nfts,
				collection: mockNftollectionUi.collection
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
