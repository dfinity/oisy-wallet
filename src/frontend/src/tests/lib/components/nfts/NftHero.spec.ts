import NftHero from '$lib/components/nfts/NftHero.svelte';
import { NFT_HIDDEN_BADGE } from '$lib/constants/test-ids.constants';
import { CustomTokenSection } from '$lib/enums/custom-token-section';
import { i18n } from '$lib/stores/i18n.store';
import { modalStore } from '$lib/stores/modal.store';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import * as nftsUtils from '$lib/utils/nfts.utils';
import { AZUKI_ELEMENTAL_BEANS_TOKEN } from '$tests/mocks/erc721-tokens.mock';
import { mockNftollectionUi, mockValidErc1155Nft } from '$tests/mocks/nfts.mock';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('NftHero', () => {
	const openFullscreenSpy = vi
		.spyOn(modalStore, 'openNftFullscreenDisplay')
		.mockImplementation(() => {});

	const openSendSpy = vi.spyOn(modalStore, 'openSend');

	beforeAll(() => {
		vi.spyOn(nftsUtils, 'getAllowMediaForNft').mockReturnValue(true);
	});

	it('should render the nft data', () => {
		const { getByText } = render(NftHero, {
			props: {
				nft: mockValidErc1155Nft
			}
		});

		assertNonNullish(mockValidErc1155Nft.name);

		const name: HTMLElement | null = getByText(
			`${mockValidErc1155Nft.name} #${String(mockValidErc1155Nft.id)}`
		);

		expect(name).toBeInTheDocument();

		const standard: HTMLElement | null = getByText(mockNftollectionUi.collection.standard);

		expect(standard).toBeInTheDocument();

		const address: HTMLElement | null = getByText(
			shortenWithMiddleEllipsis({ text: mockNftollectionUi.collection.address })
		);

		expect(address).toBeInTheDocument();

		const network: HTMLElement | null = getByText(mockNftollectionUi.collection.network.name);

		expect(network).toBeInTheDocument();

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
});
