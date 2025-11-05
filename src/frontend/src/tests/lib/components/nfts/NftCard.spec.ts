import NftCard from '$lib/components/nfts/NftCard.svelte';
import { NFT_COLLECTION_ROUTE, NFT_LIST_ROUTE } from '$lib/constants/analytics.constants';
import {
	PLAUSIBLE_EVENTS,
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_SOURCES,
	PLAUSIBLE_EVENT_VALUES
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import { mockValidErc1155Nft, mockValidErc721Nft } from '$tests/mocks/nfts.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

describe('NftCard', () => {
	const testId = 'nft-card';

	const imageSelector = `div[data-tid="${testId}-image"]`;
	const networkLogoSelector = `div[data-tid="${testId}-network-light-container"]`;
	const balanceSelector = `span[data-tid="${testId}-balance"]`;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render nft with metadata', () => {
		const { container, getByText } = render(NftCard, {
			props: {
				nft: mockValidErc1155Nft,
				testId,
				type: 'card-link',
				source: NFT_COLLECTION_ROUTE
			}
		});

		const image: HTMLDivElement | null = container.querySelector(imageSelector);

		expect(image).toBeInTheDocument();

		const networkLogo: HTMLDivElement | null = container.querySelector(networkLogoSelector);

		expect(networkLogo).toBeInTheDocument();

		const balance: HTMLSpanElement | null = container.querySelector(balanceSelector);

		expect(balance).toBeInTheDocument();

		assertNonNullish(mockValidErc1155Nft?.name);

		expect(getByText(mockValidErc1155Nft.name)).toBeInTheDocument();
		expect(getByText(`#${mockValidErc1155Nft.id}`)).toBeInTheDocument();
	});

	it('should render image placeholder if no image is defined', () => {
		const { container, getByText } = render(NftCard, {
			props: {
				nft: { ...mockValidErc721Nft, imageUrl: undefined },
				testId,
				type: 'card-link',
				source: NFT_LIST_ROUTE
			}
		});

		const image: HTMLDivElement | null = container.querySelector(imageSelector);

		expect(image?.getAttribute('class')?.includes('animate-pulse')).toBeTruthy();

		const networkLogo: HTMLDivElement | null = container.querySelector(networkLogoSelector);

		expect(networkLogo).toBeInTheDocument();

		assertNonNullish(mockValidErc721Nft.name);
		assertNonNullish(mockValidErc721Nft.collection.name);

		expect(getByText(`#${mockValidErc721Nft.id}`)).toBeInTheDocument();
	});

	it('should render the correct styles for each type', async () => {
		const { container, rerender } = render(NftCard, {
			props: {
				nft: { ...mockValidErc721Nft, imageUrl: undefined },
				testId,
				type: 'default'
			}
		});

		const cardElement = container.querySelector('button');

		assertNonNullish(cardElement);

		expect(cardElement.getAttribute('class')?.includes(' bg-primary')).toBeTruthy();
		expect(cardElement.getAttribute('class')?.includes(' group')).toBeFalsy();
		expect(cardElement.getAttribute('class')?.includes(' hover:bg-primary')).toBeFalsy();

		await rerender({
			nft: { ...mockValidErc721Nft, imageUrl: undefined },
			testId,
			type: 'card-link'
		});

		expect(cardElement.getAttribute('class')?.includes(' bg-primary')).toBeFalsy();
		expect(cardElement.getAttribute('class')?.includes(' group')).toBeTruthy();
		expect(cardElement.getAttribute('class')?.includes(' hover:bg-primary')).toBeTruthy();

		await rerender({
			nft: { ...mockValidErc721Nft, imageUrl: undefined },
			testId,
			type: 'card-selectable'
		});

		expect(cardElement.getAttribute('class')?.includes(' bg-primary')).toBeFalsy();
		expect(cardElement.getAttribute('class')?.includes(' group')).toBeTruthy();
		expect(cardElement.getAttribute('class')?.includes(' hover:bg-primary')).toBeTruthy();
	});

	it('should track event with spam status on click when isSpam is true', () => {
		const { container } = render(NftCard, {
			props: {
				nft: mockValidErc721Nft,
				testId,
				type: 'card-link',
				isSpam: true
			}
		});

		const button = container.querySelector('button');
		assertNonNullish(button);

		button.click();

		expect(trackEvent).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.PAGE_OPEN,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
				event_value: PLAUSIBLE_EVENT_VALUES.NFT_PAGE,
				location_source: PLAUSIBLE_EVENT_SOURCES.NAVIGATION,
				token_network: mockValidErc721Nft.collection.network.name,
				token_address: mockValidErc721Nft.collection.address,
				token_symbol: mockValidErc721Nft.collection.symbol,
				token_name: mockValidErc721Nft.name,
				token_id: mockValidErc721Nft.id
			}
		});
	});

	it('should track event with hidden status on click when isHidden is true and isSpam is false', () => {
		const { container } = render(NftCard, {
			props: {
				nft: mockValidErc721Nft,
				testId,
				type: 'card-link',
				isHidden: true
			}
		});

		const button = container.querySelector('button');
		assertNonNullish(button);

		button.click();

		expect(trackEvent).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.PAGE_OPEN,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
				event_value: PLAUSIBLE_EVENT_VALUES.NFT_PAGE,
				location_source: PLAUSIBLE_EVENT_SOURCES.NAVIGATION,
				token_network: mockValidErc721Nft.collection.network.name,
				token_address: mockValidErc721Nft.collection.address,
				token_symbol: mockValidErc721Nft.collection.symbol,
				token_name: mockValidErc721Nft.name,
				token_id: mockValidErc721Nft.id
			}
		});
	});

	it('should track event without nftStatus when neither isSpam nor isHidden', () => {
		const { container } = render(NftCard, {
			props: {
				nft: mockValidErc721Nft,
				testId,
				type: 'card-link'
			}
		});

		const button = container.querySelector('button');
		assertNonNullish(button);

		button.click();

		expect(trackEvent).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.PAGE_OPEN,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
				event_value: PLAUSIBLE_EVENT_VALUES.NFT_PAGE,
				location_source: PLAUSIBLE_EVENT_SOURCES.NAVIGATION,
				token_network: mockValidErc721Nft.collection.network.name,
				token_address: mockValidErc721Nft.collection.address,
				token_symbol: mockValidErc721Nft.collection.symbol,
				token_name: mockValidErc721Nft.name,
				token_id: mockValidErc721Nft.id
			}
		});
	});

	it('should render nft name when withCollectionLabel is false (default)', () => {
		const { getByText, queryByText } = render(NftCard, {
			props: {
				nft: mockValidErc721Nft,
				testId,
				type: 'card-link'
			}
		});

		assertNonNullish(mockValidErc721Nft.name);
		assertNonNullish(mockValidErc721Nft.collection.name);

		// Should show nft.name as the main label
		expect(getByText(mockValidErc721Nft.name)).toBeInTheDocument();

		// Should NOT show collection name in title
		expect(queryByText(mockValidErc721Nft.collection.name)).toBeNull();

		// Subtitle should just be the id
		expect(getByText(`#${mockValidErc721Nft.id}`)).toBeInTheDocument();
		expect(queryByText(`#${mockValidErc721Nft.id} – ${mockValidErc721Nft.name}`)).toBeNull();
	});

	it('should render collection name and nft name when withCollectionLabel is true', () => {
		const { getByText } = render(NftCard, {
			props: {
				nft: mockValidErc721Nft,
				testId,
				type: 'card-link',
				withCollectionLabel: true
			}
		});

		assertNonNullish(mockValidErc721Nft.name);
		assertNonNullish(mockValidErc721Nft.collection.name);

		// Should show collection name instead of nft name as title
		expect(getByText(mockValidErc721Nft.collection.name)).toBeInTheDocument();

		// Subtitle should show both id and nft name
		expect(getByText(`#${mockValidErc721Nft.id} – ${mockValidErc721Nft.name}`)).toBeInTheDocument();
	});
});
