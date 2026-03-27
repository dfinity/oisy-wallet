import * as navUtils from '$app/navigation';
import NftCollectionCard from '$lib/components/nfts/NftCollectionCard.svelte';
import { i18n } from '$lib/stores/i18n.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { nftsUrl } from '$lib/utils/nav.utils';
import { mockNftCollectionUi } from '$tests/mocks/nfts.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('NftCollectionCard', () => {
	const gotoSpy = vi.spyOn(navUtils, 'goto');
	const testId = 'nft-collection-card';

	const getImageSelector = (index: number) => `div[data-tid="${testId}-image-${index}"]`;
	const networkLogoSelector = `div[data-tid="${testId}-network-light-container"]`;

	it('should render nft collection', () => {
		const { container, getByText } = render(NftCollectionCard, {
			props: {
				collection: mockNftCollectionUi,
				testId
			}
		});

		const image1: HTMLDivElement | null = container.querySelector(getImageSelector(0));

		expect(image1).toBeInTheDocument();

		const image2: HTMLDivElement | null = container.querySelector(getImageSelector(1));

		expect(image2).toBeInTheDocument();

		const networkLogo: HTMLDivElement | null = container.querySelector(networkLogoSelector);

		expect(networkLogo).toBeInTheDocument();

		assertNonNullish(mockNftCollectionUi.collection.name);

		expect(getByText(mockNftCollectionUi.collection.name)).toBeInTheDocument();
		expect(
			getByText(
				`${replacePlaceholders(get(i18n).nfts.text.collection_items_count, { $count: String(mockNftCollectionUi.nfts.length) })}`
			)
		).toBeInTheDocument();
	});

	it('should go to collection page if clicked', () => {
		const { container } = render(NftCollectionCard, {
			props: {
				collection: mockNftCollectionUi,
				testId
			}
		});

		const button = container.querySelector('button');
		button?.click();

		expect(gotoSpy).toHaveBeenCalledWith(nftsUrl({ collection: mockNftCollectionUi.collection }));
	});

	it('should go to nft page if clicked and collection has only 1 nft', () => {
		const { container } = render(NftCollectionCard, {
			props: {
				collection: {
					collection: mockNftCollectionUi.collection,
					nfts: [mockNftCollectionUi.nfts[0]]
				},
				testId
			}
		});

		const button = container.querySelector('button');
		button?.click();

		expect(gotoSpy).toHaveBeenCalledWith(nftsUrl({ nft: mockNftCollectionUi.nfts[0] }));
	});

	it('should render a spam icon if section is spam', () => {
		const { container } = render(NftCollectionCard, {
			props: {
				isSpam: true,
				collection: mockNftCollectionUi,
				testId
			}
		});

		const decorator = container.querySelector('div.absolute.text-warning-primary svg');

		expect(decorator).toBeInTheDocument();
	});

	it('should render a spam icon if section is hidden', () => {
		const { container } = render(NftCollectionCard, {
			props: {
				isHidden: true,
				collection: mockNftCollectionUi,
				testId
			}
		});

		const decorator = container.querySelector('div.absolute.invert svg');

		expect(decorator).toBeInTheDocument();
	});
});
