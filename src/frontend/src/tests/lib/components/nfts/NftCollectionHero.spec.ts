import { POLYGON_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import NftCollectionHero from '$lib/components/nfts/NftCollectionHero.svelte';
import {
	NFT_COLLECTION_ACTION_HIDE,
	NFT_COLLECTION_ACTION_SPAM,
	NFT_HIDDEN_BADGE
} from '$lib/constants/test-ids.constants';
import { CustomTokenSection } from '$lib/enums/custom-token-section';
import type { NonFungibleToken } from '$lib/types/nft';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import * as nftsUtils from '$lib/utils/nfts.utils';
import { AZUKI_ELEMENTAL_BEANS_TOKEN } from '$tests/mocks/erc721-tokens.mock';
import { mockNftollectionUi } from '$tests/mocks/nfts.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render, waitFor } from '@testing-library/svelte';

describe('NftCollectionHero', () => {
	const spamButtonSelector = `button[data-tid="${NFT_COLLECTION_ACTION_SPAM}"]`;
	const hideButtonSelector = `button[data-tid="${NFT_COLLECTION_ACTION_HIDE}"]`;
	const hiddenBadgeSelector = `span[data-tid="${NFT_HIDDEN_BADGE}"]`;

	const mockToken: NonFungibleToken = {
		...AZUKI_ELEMENTAL_BEANS_TOKEN,
		network: POLYGON_MAINNET_NETWORK
	};

	beforeAll(() => {
		vi.spyOn(nftsUtils, 'getAllowMediaForNft').mockReturnValue(true);
	});

	it('should render the collection data', async () => {
		const { container, getByText, getAllByText } = render(NftCollectionHero, {
			props: {
				nfts: mockNftollectionUi.nfts,
				token: mockToken
			}
		});

		assertNonNullish(mockNftollectionUi.collection.name);

		const names: HTMLElement[] | null = getAllByText(mockToken.name);

		names.forEach((n) => {
			expect(n).toBeInTheDocument();
		});

		const standard: HTMLElement | null = getByText(mockToken.standard);

		expect(standard).toBeInTheDocument();

		const address: HTMLElement | null = getByText(
			shortenWithMiddleEllipsis({ text: mockToken.address })
		);

		expect(address).toBeInTheDocument();

		const network: HTMLElement | null = getByText(mockToken.network.name);

		expect(network).toBeInTheDocument();

		await waitFor(() => {
			const spamButton: HTMLButtonElement | null = container.querySelector(spamButtonSelector);

			expect(spamButton).toBeInTheDocument();

			const hideButton: HTMLButtonElement | null = container.querySelector(hideButtonSelector);

			expect(hideButton).toBeInTheDocument();
		});
	});

	it('should render the collections first nft image as a banner', () => {
		const { container } = render(NftCollectionHero, {
			props: {
				nfts: mockNftollectionUi.nfts,
				token: mockToken
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

	it('should render the hidden badge in the banner', () => {
		const { container } = render(NftCollectionHero, {
			props: {
				nfts: mockNftollectionUi.nfts,
				token: { ...mockToken, section: CustomTokenSection.HIDDEN }
			}
		});

		const hiddenBadge: HTMLSpanElement | null = container.querySelector(hiddenBadgeSelector);

		expect(hiddenBadge).toBeInTheDocument();
	});
});
