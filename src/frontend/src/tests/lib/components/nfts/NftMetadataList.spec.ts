import NftMetadataList from '$lib/components/nfts/NftMetadataList.svelte';
import { currentLanguage } from '$lib/derived/i18n.derived';
import { PLAUSIBLE_EVENT_SOURCES } from '$lib/enums/plausible';
import { extractMediaUrls } from '$lib/services/url.services';
import type { Nft } from '$lib/types/nft';
import { formatSecondsToDate, shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import en from '$tests/mocks/i18n.mock';
import { mockValidErc1155Nft } from '$tests/mocks/nfts.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock('$lib/services/url.services', () => ({
	extractMediaUrls: vi.fn()
}));

describe('NftMetadataList', () => {
	const mockNft: Nft = {
		...mockValidErc1155Nft,
		description: 'Test description about the NFT',
		collection: {
			...mockValidErc1155Nft.collection,
			standard: {
				...mockValidErc1155Nft.collection.standard,
				version: 'vMock'
			}
		}
	};

	const baseProps = {
		source: PLAUSIBLE_EVENT_SOURCES.NFT_PAGE as const
	};

	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(extractMediaUrls).mockResolvedValue([]);
	});

	describe('when the NFT is provided', () => {
		const props = {
			...baseProps,
			nft: mockNft
		};

		it('should render the standard', () => {
			const { getByText } = render(NftMetadataList, {
				props
			});

			const standard: HTMLElement | null = getByText(mockNft.collection.standard.code);

			expect(standard).toBeDefined();
			expect(standard).toBeInTheDocument();

			assertNonNullish(mockNft.collection.standard.version);

			const standardVersion: HTMLElement | null = getByText(mockNft.collection.standard.version);

			expect(standardVersion).toBeDefined();
			expect(standardVersion).toBeInTheDocument();
		});

		it('should render the address', () => {
			const { getByText } = render(NftMetadataList, {
				props
			});

			const address: HTMLElement | null = getByText(
				shortenWithMiddleEllipsis({ text: mockNft.collection.address })
			);

			expect(address).toBeDefined();
			expect(address).toBeInTheDocument();
		});

		it('should render the network', () => {
			const { getByText } = render(NftMetadataList, {
				props
			});

			const network: HTMLElement | null = getByText(mockNft.collection.network.name);

			expect(network).toBeDefined();
			expect(network).toBeInTheDocument();
		});

		it('should render the media URL', () => {
			const { getByText } = render(NftMetadataList, {
				props
			});

			assertNonNullish(mockNft.imageUrl);

			const imageUrl: HTMLElement | null = getByText(
				shortenWithMiddleEllipsis({ text: mockNft.imageUrl, splitLength: 20 })
			);

			expect(imageUrl).toBeDefined();
			expect(imageUrl).toBeInTheDocument();
		});

		it('should render the message box for the additional URL', async () => {
			const mockUrl = 'https://example.com/additional-media';

			vi.mocked(extractMediaUrls).mockResolvedValue([mockUrl]);

			const { getByText } = render(NftMetadataList, {
				props
			});

			await waitFor(() => {
				const url: HTMLElement | null = getByText(mockUrl);

				expect(url).toBeDefined();
				expect(url).toBeInTheDocument();

				const disclaimer: HTMLElement | null = getByText(
					en.nfts.text.media_stored_at_different_location
				);

				expect(disclaimer).toBeDefined();
				expect(disclaimer).toBeInTheDocument();
			});
		});

		it('should render the acquiredAt', () => {
			const { getByText } = render(NftMetadataList, {
				props
			});

			assertNonNullish(mockNft.acquiredAt);

			const acquired_at: HTMLElement | null = getByText(
				formatSecondsToDate({
					seconds: mockNft.acquiredAt.getTime() / 1000,
					language: get(currentLanguage)
				})
			);

			expect(acquired_at).toBeDefined();
			expect(acquired_at).toBeInTheDocument();
		});

		it('should render a dash instead of the acquiredAt if the date is nullish or timestamp is 0', () => {
			const { queryByText } = render(NftMetadataList, {
				props: {
					...props,
					nft: { ...mockNft, acquiredAt: new Date(0) }
				}
			});

			const acquired_at: HTMLElement | null = queryByText(
				formatSecondsToDate({
					seconds: (mockValidErc1155Nft.acquiredAt as Date).getTime() / 1000,
					language: get(currentLanguage)
				})
			);

			expect(acquired_at).not.toBeInTheDocument();
		});

		it('should render the attributes', () => {
			const { getByText } = render(NftMetadataList, {
				props
			});

			mockNft.attributes?.forEach((attr) => {
				const attrTypeEl: HTMLElement | null = getByText(attr.traitType);

				expect(attrTypeEl).toBeDefined();
				expect(attrTypeEl).toBeInTheDocument();

				assertNonNullish(attr.value);

				const attrValEl: HTMLElement | null = getByText(attr.value);

				expect(attrValEl).toBeDefined();
				expect(attrValEl).toBeInTheDocument();
			});
		});
	});
});
