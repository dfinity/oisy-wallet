import NftActionButtons from '$lib/components/nfts/NftActionButtons.svelte';
import { NFT_ACTION_SEND } from '$lib/constants/test-ids.constants';
import { mockValidErc1155Nft } from '$tests/mocks/nfts.mock';
import { render, waitFor } from '@testing-library/svelte';

describe('NftActionButtons', () => {
	const sendButtonSelector = `button[data-tid="${NFT_ACTION_SEND}"]`;

	it('should render the send button', async () => {
		const { container } = render(NftActionButtons, {
			nft: mockValidErc1155Nft
		});

		await waitFor(() => {
			const sendButton: HTMLButtonElement | null = container.querySelector(sendButtonSelector);

			expect(sendButton).toBeInTheDocument();
		});
	});
});
