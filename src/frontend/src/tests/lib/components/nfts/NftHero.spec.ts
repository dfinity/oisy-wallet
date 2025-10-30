import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import NftHero from '$lib/components/nfts/NftHero.svelte';
import { NFT_HIDDEN_BADGE } from '$lib/constants/test-ids.constants';
import { currentLanguage } from '$lib/derived/i18n.derived';
import { CustomTokenSection } from '$lib/enums/custom-token-section';
import { i18n } from '$lib/stores/i18n.store';
import { modalStore } from '$lib/stores/modal.store';
import { userSelectedNetworkStore } from '$lib/stores/settings.store';
import type { OptionString } from '$lib/types/string';
import { formatSecondsToDate, shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { AZUKI_ELEMENTAL_BEANS_TOKEN } from '$tests/mocks/erc721-tokens.mock';
import { mockNftollectionUi, mockValidErc1155Nft } from '$tests/mocks/nfts.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('NftHero', () => {
	const openFullscreenSpy = vi
		.spyOn(modalStore, 'openNftFullscreenDisplay')
		.mockImplementation(() => {});

	const openSendSpy = vi.spyOn(modalStore, 'openSend');

	beforeEach(() => {
		userSelectedNetworkStore.reset({ key: 'user-selected-network' });
	});

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

			assertNonNullish(attr.value);

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

	it('should render the root breadcrumb with network query param if userSelectedNetwork is defined', () => {
		mockPage.mock({
			network: mockValidErc1155Nft.collection.network as unknown as OptionString
		});
		mockPage.mockDynamicRoutes({
			collectionId: `${mockValidErc1155Nft.collection.network.name}-${mockValidErc1155Nft.collection.address}`
		});
		userSelectedNetworkStore.set({
			key: 'user-selected-network',
			value: ETHEREUM_NETWORK_ID.description
		});

		const { container } = render(NftHero, {
			props: {
				token: { ...AZUKI_ELEMENTAL_BEANS_TOKEN },
				nft: mockValidErc1155Nft
			}
		});

		const firstBreadcrumElmt = container.querySelector(
			'div.text-xs.font-bold a.no-underline:first-of-type'
		);

		expect(firstBreadcrumElmt?.getAttribute('href')).toContain(
			`network=${ETHEREUM_NETWORK_ID.description}`
		);
	});

	it('should render the root breadcrumb without network query param if userSelectedNetwork is not defined', () => {
		mockPage.mock({
			network: mockValidErc1155Nft.collection.network as unknown as OptionString
		});
		mockPage.mockDynamicRoutes({
			collectionId: `${mockValidErc1155Nft.collection.network.name}-${mockValidErc1155Nft.collection.address}`
		});

		const { container } = render(NftHero, {
			props: {
				token: { ...AZUKI_ELEMENTAL_BEANS_TOKEN },
				nft: mockValidErc1155Nft
			}
		});

		const firstBreadcrumElmt = container.querySelector(
			'div.text-xs.font-bold a.no-underline:first-of-type'
		);

		expect(firstBreadcrumElmt?.getAttribute('href')).not.toContain('network=');
	});

	it('should render the acquiredAt', () => {
		const { queryByText } = render(NftHero, {
			props: {
				nft: { ...mockValidErc1155Nft }
			}
		});

		const acquired_at: HTMLElement | null = queryByText(
			formatSecondsToDate({
				seconds: (mockValidErc1155Nft.acquiredAt as Date).getTime() / 1000,
				language: get(currentLanguage)
			})
		);

		expect(acquired_at).toBeInTheDocument();
	});

	it('should render a dash instead of the acquiredAt if the date is nullish or timestamp is 0', () => {
		const { queryByText } = render(NftHero, {
			props: {
				nft: { ...mockValidErc1155Nft, acquiredAt: new Date(0) }
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
});
