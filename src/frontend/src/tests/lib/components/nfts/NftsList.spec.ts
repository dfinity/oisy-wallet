import NftsList from '$lib/components/nfts/NftsList.svelte';
import {
	NFT_COLLECTION_LIST_COMMON,
	NFT_COLLECTION_LIST_HIDDEN,
	NFT_COLLECTION_LIST_SPAM,
	NFT_LIST_COMMON,
	NFT_LIST_HIDDEN,
	NFT_LIST_SPAM
} from '$lib/constants/test-ids.constants';
import * as networkTokens from '$lib/derived/network-tokens.derived';
import * as settingsDerived from '$lib/derived/settings.derived';
import * as tokens from '$lib/derived/tokens.derived';
import { CustomTokenSection } from '$lib/enums/custom-token-section';
import { i18n } from '$lib/stores/i18n.store';
import { nftStore } from '$lib/stores/nft.store';
import * as nftsUtils from '$lib/utils/nfts.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import {
	mockNonFungibleToken1,
	mockNonFungibleToken2,
	mockValidErc1155Nft
} from '$tests/mocks/nfts.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';
import { get, writable } from 'svelte/store';

describe('NftsList', () => {
	const mockNfts = [
		{ ...mockValidErc1155Nft, name: 'Null', id: parseNftId(0) },
		{ ...mockValidErc1155Nft, name: 'Eins', id: parseNftId(1) },
		{ ...mockValidErc1155Nft, name: 'Zwei', id: parseNftId(2) }
	];

	beforeAll(() => {
		vi.spyOn(nftsUtils, 'getAllowMediaForNft').mockReturnValue(true);
	});

	beforeEach(() => {
		nftStore.resetAll();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('display collections', () => {
		const commonCollectionListSelector = `div[data-tid="${NFT_COLLECTION_LIST_COMMON}"]`;
		const hiddenCollectionListSelector = `div[data-tid="${NFT_COLLECTION_LIST_HIDDEN}"]`;
		const spamCollectionListSelector = `div[data-tid="${NFT_COLLECTION_LIST_SPAM}"]`;

		it('should render common nft collections', () => {
			nftStore.addAll(mockNfts);

			vi.spyOn(networkTokens, 'enabledNonFungibleNetworkTokens', 'get').mockReturnValue(
				writable([mockNonFungibleToken1, mockNonFungibleToken2])
			);
			vi.spyOn(tokens, 'nonFungibleTokens', 'get').mockReturnValue(
				writable([mockNonFungibleToken1, mockNonFungibleToken2])
			);

			const { container } = render(NftsList);

			const commonCollectionList: HTMLDivElement | null = container.querySelector(
				commonCollectionListSelector
			);

			expect(commonCollectionList).toBeInTheDocument();
		});

		it('should render hidden nft collections', () => {
			nftStore.addAll(mockNfts);

			vi.spyOn(settingsDerived, 'showHidden', 'get').mockReturnValue(writable(true));

			vi.spyOn(networkTokens, 'enabledNonFungibleNetworkTokens', 'get').mockReturnValue(
				writable([mockNonFungibleToken1, mockNonFungibleToken2])
			);
			vi.spyOn(tokens, 'nonFungibleTokens', 'get').mockReturnValue(
				writable([
					{ ...mockNonFungibleToken1, section: CustomTokenSection.HIDDEN },
					{ ...mockNonFungibleToken2, section: CustomTokenSection.HIDDEN }
				])
			);

			const { container } = render(NftsList);

			const hiddenCollectionList: HTMLDivElement | null = container.querySelector(
				hiddenCollectionListSelector
			);

			expect(hiddenCollectionList).toBeInTheDocument();
		});

		it('should render spam nft collections', () => {
			nftStore.addAll(mockNfts);

			vi.spyOn(settingsDerived, 'showSpam', 'get').mockReturnValue(writable(true));

			vi.spyOn(networkTokens, 'enabledNonFungibleNetworkTokens', 'get').mockReturnValue(
				writable([mockNonFungibleToken1, mockNonFungibleToken2])
			);
			vi.spyOn(tokens, 'nonFungibleTokens', 'get').mockReturnValue(
				writable([
					{ ...mockNonFungibleToken1, section: CustomTokenSection.SPAM },
					{ ...mockNonFungibleToken2, section: CustomTokenSection.SPAM }
				])
			);

			const { container } = render(NftsList);

			const spamCollectionList: HTMLDivElement | null = container.querySelector(
				spamCollectionListSelector
			);

			expect(spamCollectionList).toBeInTheDocument();
		});
	});

	describe('display nfts', () => {
		const commonNftListSelector = `div[data-tid="${NFT_LIST_COMMON}"]`;
		const hiddenNftListSelector = `div[data-tid="${NFT_LIST_HIDDEN}"]`;
		const spamNftListSelector = `div[data-tid="${NFT_LIST_SPAM}"]`;

		beforeEach(() => {
			vi.spyOn(settingsDerived, 'nftGroupByCollection', 'get').mockReturnValue(writable(false));
		});

		it('should render common nft lists', () => {
			nftStore.addAll(mockNfts);

			vi.spyOn(networkTokens, 'enabledNonFungibleNetworkTokens', 'get').mockReturnValue(
				writable([mockNonFungibleToken1, mockNonFungibleToken2])
			);
			vi.spyOn(tokens, 'nonFungibleTokens', 'get').mockReturnValue(
				writable([mockNonFungibleToken1, mockNonFungibleToken2])
			);

			const { container } = render(NftsList);

			const commonNftList: HTMLDivElement | null = container.querySelector(commonNftListSelector);

			expect(commonNftList).toBeInTheDocument();
		});

		it('should render hidden nft lists', () => {
			nftStore.addAll(mockNfts);

			vi.spyOn(settingsDerived, 'showHidden', 'get').mockReturnValue(writable(true));

			vi.spyOn(networkTokens, 'enabledNonFungibleNetworkTokens', 'get').mockReturnValue(
				writable([mockNonFungibleToken1, mockNonFungibleToken2])
			);
			vi.spyOn(tokens, 'nonFungibleTokens', 'get').mockReturnValue(
				writable([
					{ ...mockNonFungibleToken1, section: CustomTokenSection.HIDDEN },
					{ ...mockNonFungibleToken2, section: CustomTokenSection.HIDDEN }
				])
			);

			const { container } = render(NftsList);

			const hiddenNftList: HTMLDivElement | null = container.querySelector(hiddenNftListSelector);

			expect(hiddenNftList).toBeInTheDocument();
		});

		it('should render spam nft lists', () => {
			nftStore.addAll(mockNfts);

			vi.spyOn(settingsDerived, 'showSpam', 'get').mockReturnValue(writable(true));

			vi.spyOn(networkTokens, 'enabledNonFungibleNetworkTokens', 'get').mockReturnValue(
				writable([mockNonFungibleToken1, mockNonFungibleToken2])
			);
			vi.spyOn(tokens, 'nonFungibleTokens', 'get').mockReturnValue(
				writable([
					{ ...mockNonFungibleToken1, section: CustomTokenSection.SPAM },
					{ ...mockNonFungibleToken2, section: CustomTokenSection.SPAM }
				])
			);

			const { container } = render(NftsList);

			const spamNftList: HTMLDivElement | null = container.querySelector(spamNftListSelector);

			expect(spamNftList).toBeInTheDocument();
		});
	});

	it('should render a placeholder if no collections', () => {
		const { getByText } = render(NftsList);

		const h5 = getByText(get(i18n).nfts.text.title_empty);

		assertNonNullish(h5);

		expect(h5).toBeInTheDocument();
	});

	it('should render a placeholder if no visible collections', () => {
		nftStore.addAll(mockNfts);

		vi.spyOn(networkTokens, 'enabledNonFungibleNetworkTokens', 'get').mockReturnValue(
			writable([mockNonFungibleToken1, mockNonFungibleToken2])
		);
		vi.spyOn(tokens, 'nonFungibleTokens', 'get').mockReturnValue(
			writable([
				{ ...mockNonFungibleToken1, section: CustomTokenSection.SPAM },
				{ ...mockNonFungibleToken2, section: CustomTokenSection.SPAM }
			])
		);

		const { getByText } = render(NftsList);

		const h5 = getByText(get(i18n).nfts.text.title_empty);

		assertNonNullish(h5);

		expect(h5).toBeInTheDocument();
	});
});
