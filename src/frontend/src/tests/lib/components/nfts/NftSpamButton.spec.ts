import NftSpamButton from '$lib/components/nfts/NftSpamButton.svelte';
import {
	CONFIRMATION_MODAL,
	NFT_COLLECTION_ACTION_NOT_SPAM,
	NFT_COLLECTION_ACTION_SPAM
} from '$lib/constants/test-ids.constants';
import { CustomTokenSection } from '$lib/enums/custom-token-section';
import * as nftsServices from '$lib/services/nft.services';
import { nftStore } from '$lib/stores/nft.store';
import { parseNftId } from '$lib/validation/nft.validation';
import { mockValidErc1155Token } from '$tests/mocks/erc1155-tokens.mock';
import { mockValidErc1155Nft } from '$tests/mocks/nfts.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

const mockToken = { ...mockValidErc1155Token };
const mockNft = { ...mockValidErc1155Nft };

describe('NftSpamButton', () => {
	beforeEach(() => {
		nftStore.addAll([]);
	});

	it('renders Not Spam button when token.section is SPAM', () => {
		const token = { ...mockToken, section: CustomTokenSection.SPAM };
		const { getByTestId } = render(NftSpamButton, { props: { token } });

		const notSpamBtn = getByTestId(NFT_COLLECTION_ACTION_NOT_SPAM);

		expect(notSpamBtn).toBeInTheDocument();
	});

	it('renders ConfirmButtonWithModal when collection has multiple NFTs', async () => {
		nftStore.addAll([mockNft, { ...mockNft, id: parseNftId(123) }]);

		const { getByTestId } = render(NftSpamButton, { props: { token: mockToken } });

		const spamBtn = getByTestId(NFT_COLLECTION_ACTION_SPAM);

		expect(spamBtn).toBeInTheDocument();

		await fireEvent.click(spamBtn);

		await waitFor(() => {
			const modal = getByTestId(CONFIRMATION_MODAL);

			expect(modal).toBeInTheDocument();

			const confirmBtn = getByTestId(`${CONFIRMATION_MODAL}-confirm`);

			expect(confirmBtn).toBeInTheDocument();
		});
	});

	it('renders plain Spam button when collection has just one NFT', async () => {
		nftStore.addAll([mockNft]);

		const { getByTestId, queryByTestId } = render(NftSpamButton, { props: { token: mockToken } });

		const spamBtn = getByTestId(NFT_COLLECTION_ACTION_SPAM);

		expect(spamBtn).toBeInTheDocument();

		await fireEvent.click(spamBtn);

		await waitFor(() => {
			expect(queryByTestId(CONFIRMATION_MODAL)).toBeNull();
		});
	});

	it('should display a loading indicator on the button during the action', async () => {
		nftStore.addAll([mockNft]);
		vi.spyOn(nftsServices, 'updateNftSection').mockReturnValue(
			new Promise((r) => setTimeout(r, 100))
		);

		const { getByTestId } = render(NftSpamButton, { props: { token: mockToken } });

		const spamBtn = getByTestId(NFT_COLLECTION_ACTION_SPAM);

		expect(spamBtn).toBeInTheDocument();

		await fireEvent.click(spamBtn);

		await waitFor(() => {
			const svg = spamBtn.querySelector('svg.spinner');

			expect(svg).toBeInTheDocument();
		});
	});
});
