import NftHideButton from '$lib/components/nfts/NftHideButton.svelte';
import {
	CONFIRMATION_MODAL,
	NFT_COLLECTION_ACTION_HIDE,
	NFT_COLLECTION_ACTION_UNHIDE
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

		screensStore.set('md');
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
		vi.spyOn(nftsServices, 'updateNftSection').mockResolvedValue(undefined);

		const { getByTestId } = render(NftHideButton, {
			props: { token: mockToken, source: 'collection' }
		});

		const hideBtn = getByTestId(NFT_COLLECTION_ACTION_HIDE);
		await fireEvent.click(hideBtn);

		expect(trackEvent).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.NFT_CATEGORIZE,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
				event_subcontext: 'collection',
				event_value: 'hide',
				location_source: 'collection',
				token_name: mockToken.name,
				token_address: mockToken.address,
				token_network: mockToken.network.name,
				token_standard: mockToken.standard.code,
				result_status: 'success'
			}
		});
	});

	it('should track event with "show" action when unhide button is clicked', async () => {
		const hiddenToken = { ...mockToken, section: CustomTokenSection.HIDDEN };
		vi.spyOn(nftsServices, 'updateNftSection').mockResolvedValue(undefined);

		const { getByTestId } = render(NftHideButton, {
			props: { token: hiddenToken, source: 'collection' }
		});

		const unhideBtn = getByTestId(NFT_COLLECTION_ACTION_UNHIDE);
		await fireEvent.click(unhideBtn);

		expect(trackEvent).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.NFT_CATEGORIZE,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
				event_subcontext: 'collection',
				event_value: 'show',
				location_source: 'collection',
				token_name: mockToken.name,
				token_address: mockToken.address,
				token_network: mockToken.network.name,
				token_standard: mockToken.standard.code,
				result_status: 'success'
			}
		});
	});

	it('should track event when confirm button is clicked in modal for multiple NFTs', async () => {
		nftStore.addAll([mockNft, { ...mockNft, id: parseNftId('123') }]);
		vi.spyOn(nftsServices, 'updateNftSection').mockResolvedValue(undefined);

		const { getByTestId } = render(NftHideButton, {
			props: { token: mockToken, source: 'collection' }
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
			name: PLAUSIBLE_EVENTS.NFT_CATEGORIZE,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.NFT,
				event_subcontext: 'collection',
				event_value: 'hide',
				location_source: 'collection',
				token_name: mockToken.name,
				token_address: mockToken.address,
				token_network: mockToken.network.name,
				token_standard: mockToken.standard.code,
				result_status: 'success'
			}
		});
	});
});
