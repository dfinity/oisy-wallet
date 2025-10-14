import NftHideButton from '$lib/components/nfts/NftHideButton.svelte';
import {
	CONFIRMATION_MODAL,
	NFT_COLLECTION_ACTION_HIDE,
	NFT_COLLECTION_ACTION_UNHIDE
} from '$lib/constants/test-ids.constants';
import { CustomTokenSection } from '$lib/enums/custom-token-section';
import * as nftsServices from '$lib/services/nft.services';
import { nftStore } from '$lib/stores/nft.store';
import { parseNftId } from '$lib/validation/nft.validation';
import { mockValidErc1155Token } from '$tests/mocks/erc1155-tokens.mock';
import { mockValidErc1155Nft } from '$tests/mocks/nfts.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';

const mockToken = { ...mockValidErc1155Token };
const mockNft = { ...mockValidErc1155Nft };

describe('NftHideButton', () => {
	beforeEach(() => {
		nftStore.addAll([]);
	});

	it('renders Unhide button when token.section is HIDDEN', () => {
		const token = { ...mockToken, section: CustomTokenSection.HIDDEN };
		const { getByTestId } = render(NftHideButton, { props: { token } });

		const notSpamBtn = getByTestId(NFT_COLLECTION_ACTION_UNHIDE);

		expect(notSpamBtn).toBeInTheDocument();
	});

	it('renders ConfirmButtonWithModal when collection has multiple NFTs', async () => {
		nftStore.addAll([mockNft, { ...mockNft, id: parseNftId(123) }]);

		const { getByTestId } = render(NftHideButton, { props: { token: mockToken } });

		const spamBtn = getByTestId(NFT_COLLECTION_ACTION_HIDE);

		expect(spamBtn).toBeInTheDocument();

		await fireEvent.click(spamBtn);

		await waitFor(() => {
			const modal = getByTestId(CONFIRMATION_MODAL);

			expect(modal).toBeInTheDocument();

			const confirmBtn = getByTestId(`${CONFIRMATION_MODAL}-confirm`);

			expect(confirmBtn).toBeInTheDocument();
		});
	});

	it('renders plain Hide button when collection has just one NFT', async () => {
		nftStore.addAll([mockNft]);

		const { getByTestId, queryByTestId } = render(NftHideButton, { props: { token: mockToken } });

		const spamBtn = getByTestId(NFT_COLLECTION_ACTION_HIDE);

		expect(spamBtn).toBeInTheDocument();

		await fireEvent.click(spamBtn);

		await waitFor(() => {
			expect(queryByTestId(CONFIRMATION_MODAL)).toBeNull();
		});
	});

	it('should display a loading indicator on the button during the action', async () => {
		nftStore.addAll([mockNft]);
		vi.spyOn(nftsServices, 'updateNftSection').mockReturnValue(
			new Promise((r) => setTimeout(r, 5000))
		);

		const { container, getByTestId } = render(NftHideButton, { props: { token: mockToken } });

		const hideBtn = getByTestId(NFT_COLLECTION_ACTION_HIDE);

		expect(hideBtn).toBeInTheDocument();

		await fireEvent.click(hideBtn);

		await tick();

		console.log(container.innerHTML);

		const svg = hideBtn.querySelector('svg.spinner');

		expect(svg).toBeInTheDocument();
	});
});
