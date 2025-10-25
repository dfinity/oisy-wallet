import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import NftHero from '$lib/components/nfts/NftHero.svelte';
import { NFT_HIDDEN_BADGE } from '$lib/constants/test-ids.constants';
import { currentLanguage } from '$lib/derived/i18n.derived';
import { CustomTokenSection } from '$lib/enums/custom-token-section';
import { i18n } from '$lib/stores/i18n.store';
import { modalStore } from '$lib/stores/modal.store';
import { NFT_PAGES_CONTEXT_KEY } from '$lib/stores/nft-pages.store';
import type { OptionNetworkId } from '$lib/types/network';
import type { OptionString } from '$lib/types/string';
import { formatSecondsToDate, shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { nftsUrl } from '$lib/utils/nav.utils';
import { AZUKI_ELEMENTAL_BEANS_TOKEN } from '$tests/mocks/erc721-tokens.mock';
import { mockNftollectionUi, mockValidErc1155Nft } from '$tests/mocks/nfts.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import * as svelte from 'svelte';
import { get, writable } from 'svelte/store';

const createMockNftPagesStore = (originSelectedNetwork: OptionNetworkId) => {
	const { subscribe, set } = writable({
		assetsTab: undefined,
		originSelectedNetwork
	});
	return {
		subscribe,
		setAssetsTab: vi.fn(),
		setOriginSelectedNetwork: vi.fn(),
		set
	};
};

const originalGetContext = svelte.getContext;

vi.spyOn(svelte, 'getContext').mockImplementation((key) =>
	key === NFT_PAGES_CONTEXT_KEY ? createMockNftPagesStore(undefined) : originalGetContext(key)
);

describe('NftHero', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const openFullscreenSpy = vi
		.spyOn(modalStore, 'openNftFullscreenDisplay')
		.mockImplementation(() => {});

	const openSendSpy = vi.spyOn(modalStore, 'openSend');

	it('should render the nft data', () => {
		const { getByText } = render(NftHero, {
			props: {
				nft: { ...mockValidErc1155Nft, description: 'Test description about the NFT' }
			}
		});

		assertNonNullish(mockValidErc1155Nft.name);

		const name: HTMLElement | null = getByText(
			`${mockValidErc1155Nft.name} #${String(mockValidErc1155Nft.id)}`
		);

		expect(name).toBeInTheDocument();

		const description: HTMLElement | null = getByText('Test description about the NFT');

		assertNonNullish(description);

		expect(description).toBeInTheDocument();

		const standard: HTMLElement | null = getByText(mockNftollectionUi.collection.standard);

		expect(standard).toBeInTheDocument();

		const address: HTMLElement | null = getByText(
			shortenWithMiddleEllipsis({ text: mockNftollectionUi.collection.address })
		);

		expect(address).toBeInTheDocument();

		const network: HTMLElement | null = getByText(mockNftollectionUi.collection.network.name);

		expect(network).toBeInTheDocument();

		assertNonNullish(mockValidErc1155Nft.imageUrl);

		const imageUrl: HTMLElement | null = getByText(
			shortenWithMiddleEllipsis({ text: mockValidErc1155Nft.imageUrl, splitLength: 20 })
		);

		expect(imageUrl).toBeInTheDocument();

		assertNonNullish(mockValidErc1155Nft.acquiredAt);

		const acquired_at: HTMLElement | null = getByText(
			formatSecondsToDate({
				seconds: mockValidErc1155Nft.acquiredAt.getTime() / 1000,
				language: get(currentLanguage)
			})
		);

		expect(acquired_at).toBeInTheDocument();

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

	it('should render the hidden badge in the banner', () => {
		const hiddenBadgeSelector = `span[data-tid="${NFT_HIDDEN_BADGE}"]`;

		const { container } = render(NftHero, {
			props: {
				token: { ...AZUKI_ELEMENTAL_BEANS_TOKEN, section: CustomTokenSection.HIDDEN },
				nft: mockValidErc1155Nft
			}
		});

		const hiddenBadge: HTMLSpanElement | null = container.querySelector(hiddenBadgeSelector);

		expect(hiddenBadge).toBeInTheDocument();
	});

	it('should open the Nft in a fullscreen modal when clicked', () => {
		const { container } = render(NftHero, {
			props: {
				token: { ...AZUKI_ELEMENTAL_BEANS_TOKEN, section: CustomTokenSection.HIDDEN },
				nft: mockValidErc1155Nft
			}
		});

		const nftImageButton = container.querySelector('.h-64 button');

		assertNonNullish(nftImageButton);

		fireEvent.click(nftImageButton);

		expect(openFullscreenSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				data: mockValidErc1155Nft,
				id: expect.any(Symbol)
			})
		);
	});

	it('should open the send modal in Nft send flow when send button is clicked', () => {
		mockPage.mock({
			network: mockValidErc1155Nft.collection.network as unknown as OptionString
		});
		mockPage.mockDynamicRoutes({
			collectionId: `${mockValidErc1155Nft.collection.network.name}-${mockValidErc1155Nft.collection.address}`
		});

		const { getByTestId, getByText } = render(NftHero, {
			props: {
				token: { ...AZUKI_ELEMENTAL_BEANS_TOKEN },
				nft: mockValidErc1155Nft
			}
		});

		const nftSendButton = getByText(get(i18n).send.text.send);

		assertNonNullish(nftSendButton);

		fireEvent.click(nftSendButton);

		waitFor(() => {
			const modalTitle = getByTestId('modal-title');

			expect(modalTitle).toHaveTextContent(get(i18n).send.text.select_nft);
		});

		expect(openSendSpy).toHaveBeenCalledOnce();
	});

	it('should build root breadcrumb url without network query param', () => {
		vi.spyOn(svelte, 'getContext').mockImplementation((key) => {
			if (key === NFT_PAGES_CONTEXT_KEY) {
				return createMockNftPagesStore(undefined);
			}
			return originalGetContext(key);
		});

		const { container } = render(NftHero, {
			props: {
				token: { ...AZUKI_ELEMENTAL_BEANS_TOKEN },
				nft: mockValidErc1155Nft
			}
		});

		const breadcrumbItem = container.querySelector('div.flex.text-xs a.no-underline:first-of-type');

		expect(breadcrumbItem?.getAttribute('href')).toEqual(nftsUrl({}));
	});

	it('should build root breadcrumb url with network query param if originSelectedNetwork is set', () => {
		vi.spyOn(svelte, 'getContext').mockImplementation((key) => {
			if (key === NFT_PAGES_CONTEXT_KEY) {
				return createMockNftPagesStore(ETHEREUM_NETWORK_ID);
			}
			return originalGetContext(key);
		});

		const { container } = render(NftHero, {
			props: {
				token: { ...AZUKI_ELEMENTAL_BEANS_TOKEN },
				nft: mockValidErc1155Nft
			}
		});

		const breadcrumbItem = container.querySelector('div.flex.text-xs a.no-underline:first-of-type');

		expect(breadcrumbItem?.getAttribute('href')).toEqual(
			nftsUrl({ originSelectedNetwork: ETHEREUM_NETWORK_ID })
		);
	});
});
