import NftHideButton from '$lib/components/nfts/NftHideButton.svelte';
import { TRACK_NFT_SPAM_HIDE_ACTION } from '$lib/constants/analytics.constants';
import {
	CONFIRMATION_MODAL,
	NFT_COLLECTION_ACTION_HIDE,
	NFT_COLLECTION_ACTION_UNHIDE
} from '$lib/constants/test-ids.constants';
import { CustomTokenSection } from '$lib/enums/custom-token-section';
import { trackEvent } from '$lib/services/analytics.services';
import * as nftsServices from '$lib/services/nft.services';
import { nftStore } from '$lib/stores/nft.store';
import { parseNftId } from '$lib/validation/nft.validation';
import { mockValidErc1155Token } from '$tests/mocks/erc1155-tokens.mock';
import { mockValidErc1155Nft } from '$tests/mocks/nfts.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

const mockToken = { ...mockValidErc1155Token };
const mockNft = { ...mockValidErc1155Nft };

describe('NftHideButton', () => {
	beforeEach(() => {
		nftStore.resetAll();
		vi.clearAllMocks();
	});

	it('renders Unhide button when token.section is HIDDEN', () => {
		const token = { ...mockToken, section: CustomTokenSection.HIDDEN };
		const { getByTestId } = render(NftHideButton, { props: { token, source: 'gallery' } });

		const notSpamBtn = getByTestId(NFT_COLLECTION_ACTION_UNHIDE);

		expect(notSpamBtn).toBeInTheDocument();
	});

	it('renders ConfirmButtonWithModal when collection has multiple NFTs', async () => {
		nftStore.addAll([mockNft, { ...mockNft, id: parseNftId('123') }]);

		const { getByTestId } = render(NftHideButton, {
			props: { token: mockToken, source: 'gallery' }
		});

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

		const { getByTestId, queryByTestId } = render(NftHideButton, {
			props: { token: mockToken, source: 'gallery' }
		});

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
			new Promise((r) => setTimeout(r, 500))
		);

		const { getByTestId } = render(NftHideButton, {
			props: { token: mockToken, source: 'gallery' }
		});

		const hideBtn = getByTestId(NFT_COLLECTION_ACTION_HIDE);

		expect(hideBtn).toBeInTheDocument();

		await fireEvent.click(hideBtn);

		await tick();

		const svg = getByTestId('spinner');

		expect(svg).toBeInTheDocument();
	});

	it('should track event with "hide" action when hide button is clicked', async () => {
		nftStore.addAll([mockNft]);
		vi.spyOn(nftsServices, 'updateNftSection').mockResolvedValue();

		const { getByTestId } = render(NftHideButton, {
			props: { token: mockToken, source: 'collection-view' }
		});

		const hideBtn = getByTestId(NFT_COLLECTION_ACTION_HIDE);
		await fireEvent.click(hideBtn);

		expect(trackEvent).toHaveBeenCalledWith({
			name: TRACK_NFT_SPAM_HIDE_ACTION,
			metadata: {
				source: 'collection-view',
				collection_name: mockToken.name,
				collection_address: mockToken.address,
				network: mockToken.network.name,
				standard: mockToken.standard,
				action: 'hide'
			}
		});
	});

	it('should track event with "unhide" action when unhide button is clicked', async () => {
		const hiddenToken = { ...mockToken, section: CustomTokenSection.HIDDEN };
		vi.spyOn(nftsServices, 'updateNftSection').mockResolvedValue();

		const { getByTestId } = render(NftHideButton, {
			props: { token: hiddenToken, source: 'hidden-tab' }
		});

		const unhideBtn = getByTestId(NFT_COLLECTION_ACTION_UNHIDE);
		await fireEvent.click(unhideBtn);

		expect(trackEvent).toHaveBeenCalledWith({
			name: TRACK_NFT_SPAM_HIDE_ACTION,
			metadata: {
				source: 'hidden-tab',
				collection_name: hiddenToken.name,
				collection_address: hiddenToken.address,
				network: hiddenToken.network.name,
				standard: hiddenToken.standard,
				action: 'unhide'
			}
		});
	});

	it('should track event when confirm button is clicked in modal for multiple NFTs', async () => {
		nftStore.addAll([mockNft, { ...mockNft, id: parseNftId('123') }]);
		vi.spyOn(nftsServices, 'updateNftSection').mockResolvedValue();

		const { getByTestId } = render(NftHideButton, {
			props: { token: mockToken, source: 'gallery' }
		});

		const hideBtn = getByTestId(NFT_COLLECTION_ACTION_HIDE);
		await fireEvent.click(hideBtn);

		await waitFor(() => {
			const confirmBtn = getByTestId(`${CONFIRMATION_MODAL}-confirm`);

			expect(confirmBtn).toBeInTheDocument();
		});

		const confirmBtn = getByTestId(`${CONFIRMATION_MODAL}-confirm`);
		await fireEvent.click(confirmBtn);

		expect(trackEvent).toHaveBeenCalledWith({
			name: TRACK_NFT_SPAM_HIDE_ACTION,
			metadata: {
				source: 'gallery',
				collection_name: mockToken.name,
				collection_address: mockToken.address,
				network: mockToken.network.name,
				standard: mockToken.standard,
				action: 'hide'
			}
		});
	});
});
