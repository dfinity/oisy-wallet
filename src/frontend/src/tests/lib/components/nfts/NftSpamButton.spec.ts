import NftSpamButton from '$lib/components/nfts/NftSpamButton.svelte';
import {
	CONFIRMATION_MODAL,
	NFT_COLLECTION_ACTION_NOT_SPAM,
	NFT_COLLECTION_ACTION_SPAM
} from '$lib/constants/test-ids.constants';
import { CustomTokenSection } from '$lib/enums/custom-token-section';
import { PLAUSIBLE_EVENTS, PLAUSIBLE_EVENT_CONTEXTS } from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import * as nftsServices from '$lib/services/nft.services';
import { nftStore } from '$lib/stores/nft.store';
import { screensStore } from '$lib/stores/screens.store';
import { parseNftId } from '$lib/validation/nft.validation';
import { mockValidErc1155Token } from '$tests/mocks/erc1155-tokens.mock';
import { mockValidErc1155Nft } from '$tests/mocks/nfts.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

const mockToken = { ...mockValidErc1155Token };
const mockNft = { ...mockValidErc1155Nft };

describe('NftSpamButton', () => {
	beforeEach(() => {
		nftStore.resetAll();
		vi.clearAllMocks();

		screensStore.set('md');
	});

	it('renders Not Spam button when token.section is SPAM', () => {
		const token = { ...mockToken, section: CustomTokenSection.SPAM };
		const { getByTestId } = render(NftSpamButton, { props: { token, source: 'gallery' } });

		const notSpamBtn = getByTestId(NFT_COLLECTION_ACTION_NOT_SPAM);

		expect(notSpamBtn).toBeInTheDocument();
	});

	it('renders ConfirmButtonWithModal when collection has multiple NFTs', async () => {
		nftStore.addAll([mockNft, { ...mockNft, id: parseNftId('123') }]);

		const { getByTestId } = render(NftSpamButton, {
			props: { token: mockToken, source: 'gallery' }
		});

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

		const { getByTestId, queryByTestId } = render(NftSpamButton, {
			props: { token: mockToken, source: 'gallery' }
		});

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
			new Promise((r) => setTimeout(r, 5000))
		);

		const { getByTestId } = render(NftSpamButton, {
			props: { token: mockToken, source: 'gallery' }
		});

		const spamBtn = getByTestId(NFT_COLLECTION_ACTION_SPAM);

		expect(spamBtn).toBeInTheDocument();

		await fireEvent.click(spamBtn);

		const svg = spamBtn.querySelector('svg.spinner');

		expect(svg).toBeInTheDocument();
	});

	it('should track event with "spam" action when spam button is clicked', async () => {
		nftStore.addAll([mockNft]);
		vi.spyOn(nftsServices, 'updateNftSection').mockResolvedValue(undefined);

		const { getByTestId } = render(NftSpamButton, {
			props: { token: mockToken, source: 'collection' }
		});

		const spamBtn = getByTestId(NFT_COLLECTION_ACTION_SPAM);
		await fireEvent.click(spamBtn);

		expect(trackEvent).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.NFT_CATEGORIZE,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
				event_subcontext: 'collection',
				event_value: 'spam',
				location_source: 'collection',
				token_name: mockToken.name,
				token_address: mockToken.address,
				token_network: mockToken.network.name,
				token_standard: mockToken.standard,
				result_status: 'success'
			}
		});
	});

	it('should track event with "unspam" action when not spam button is clicked', async () => {
		const spamToken = { ...mockToken, section: CustomTokenSection.SPAM };
		vi.spyOn(nftsServices, 'updateNftSection').mockResolvedValue(undefined);

		const { getByTestId } = render(NftSpamButton, {
			props: { token: spamToken, source: 'collection' }
		});

		const notSpamBtn = getByTestId(NFT_COLLECTION_ACTION_NOT_SPAM);
		await fireEvent.click(notSpamBtn);

		expect(trackEvent).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.NFT_CATEGORIZE,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
				event_subcontext: 'collection',
				event_value: 'unspam',
				location_source: 'collection',
				token_name: mockToken.name,
				token_address: mockToken.address,
				token_network: mockToken.network.name,
				token_standard: mockToken.standard,
				result_status: 'success'
			}
		});
	});

	it('should track event when confirm button is clicked in modal for multiple NFTs', async () => {
		nftStore.addAll([mockNft, { ...mockNft, id: parseNftId('123') }]);
		vi.spyOn(nftsServices, 'updateNftSection').mockResolvedValue(undefined);

		const { getByTestId } = render(NftSpamButton, {
			props: { token: mockToken, source: 'collection_page' }
		});

		const spamBtn = getByTestId(NFT_COLLECTION_ACTION_SPAM);
		await fireEvent.click(spamBtn);

		await waitFor(() => {
			const confirmBtn = getByTestId(`${CONFIRMATION_MODAL}-confirm`);

			expect(confirmBtn).toBeInTheDocument();
		});

		const confirmBtn = getByTestId(`${CONFIRMATION_MODAL}-confirm`);
		await fireEvent.click(confirmBtn);

		expect(trackEvent).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.NFT_CATEGORIZE,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
				event_subcontext: 'collection',
				event_value: 'spam',
				location_source: 'collection_page',
				token_name: mockToken.name,
				token_address: mockToken.address,
				token_network: mockToken.network.name,
				token_standard: mockToken.standard,
				result_status: 'success'
			}
		});
	});
});
