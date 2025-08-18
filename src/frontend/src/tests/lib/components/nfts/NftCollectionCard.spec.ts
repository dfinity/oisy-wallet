import NftCollectionCard from '$lib/components/nfts/NftCollectionCard.svelte';
import { i18n } from '$lib/stores/i18n.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockNftollectionUi } from '$tests/mocks/nfts.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('NftCollectionCard', () => {
	const testId = 'nft-collection-card';

	const getImageSelector = (index: number) => `div[data-tid="${testId}-image-${index}"]`;
	const networkLogoSelector = `div[data-tid="${testId}-network-light-container"]`;

	it('should render nft collection', () => {
		const { container, getByText } = render(NftCollectionCard, {
			props: {
				collection: mockNftollectionUi,
				testId
			}
		});

		const image1: HTMLDivElement | null = container.querySelector(getImageSelector(0));

		expect(image1).toBeInTheDocument();

		const image2: HTMLDivElement | null = container.querySelector(getImageSelector(1));

		expect(image2).toBeInTheDocument();

		const networkLogo: HTMLDivElement | null = container.querySelector(networkLogoSelector);

		expect(networkLogo).toBeInTheDocument();

		assertNonNullish(mockNftollectionUi.collection.name);

		expect(getByText(mockNftollectionUi.collection.name)).toBeInTheDocument();
		expect(
			getByText(
				`${replacePlaceholders(get(i18n).nfts.text.collection_items_count, { $count: String(mockNftollectionUi.nfts.length) })}`
			)
		).toBeInTheDocument();
	});
});
