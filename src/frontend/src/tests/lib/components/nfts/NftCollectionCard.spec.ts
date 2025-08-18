import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import NftCollectionCard from '$lib/components/nfts/NftCollectionCard.svelte';
import { i18n } from '$lib/stores/i18n.store';
import type { NftCollectionUi } from '$lib/types/nft';
import type { TokenId } from '$lib/types/token';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockValidErc1155Nft } from '$tests/mocks/nfts.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('NftCollectionCard', () => {
	const testId = 'nft-collection-card';

	const getImageSelector = (index: number) => `div[data-tid="${testId}-image-${index}"]`;
	const networkLogoSelector = `div[data-tid="${testId}-network-light-container"]`;

	const mockCollection: NftCollectionUi = {
		nfts: [mockValidErc1155Nft, mockValidErc1155Nft],
		collection: {
			name: 'Testcollection',
			address: mockEthAddress,
			network: ETHEREUM_NETWORK,
			standard: 'erc1155',
			symbol: 'testcollection',
			id: 'testcollection' as unknown as TokenId
		}
	};

	it('should render nft collection', () => {
		const { container, getByText } = render(NftCollectionCard, {
			props: {
				collection: mockCollection,
				testId
			}
		});

		const image1: HTMLDivElement | null = container.querySelector(getImageSelector(0));

		expect(image1).toBeInTheDocument();

		const image2: HTMLDivElement | null = container.querySelector(getImageSelector(1));

		expect(image2).toBeInTheDocument();

		const networkLogo: HTMLDivElement | null = container.querySelector(networkLogoSelector);

		expect(networkLogo).toBeInTheDocument();

		assertNonNullish(mockCollection.collection.name);

		expect(getByText(mockCollection.collection.name)).toBeInTheDocument();
		expect(
			getByText(
				`${replacePlaceholders(get(i18n).nfts.text.collection_items_count, { count: String(mockCollection.nfts.length) })}`
			)
		).toBeInTheDocument();
	});
});
