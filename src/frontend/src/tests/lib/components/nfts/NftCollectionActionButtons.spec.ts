import { POLYGON_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import * as erc721CustomTokens from '$eth/services/erc721-custom-tokens.services';
import NftCollectionActionButtons from '$lib/components/nfts/NftCollectionActionButtons.svelte';
import {
	NFT_COLLECTION_ACTION_HIDE,
	NFT_COLLECTION_ACTION_NOT_SPAM,
	NFT_COLLECTION_ACTION_SPAM,
	NFT_COLLECTION_ACTION_UNHIDE
} from '$lib/constants/test-ids.constants';
import { CustomTokenSection } from '$lib/enums/custom-token-section';
import type { NonFungibleToken } from '$lib/types/nft';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { AZUKI_ELEMENTAL_BEANS_TOKEN } from '$tests/mocks/erc721-tokens.mock';
import { render, waitFor } from '@testing-library/svelte';
import type { MockInstance } from 'vitest';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';

describe('NftCollectionActionButtons', () => {
	let erc721CustomTokensSpy: MockInstance;

	const spamButtonSelector = `button[data-tid="${NFT_COLLECTION_ACTION_SPAM}"]`;
	const notSpamButtonSelector = `button[data-tid="${NFT_COLLECTION_ACTION_NOT_SPAM}"]`;
	const hideButtonSelector = `button[data-tid="${NFT_COLLECTION_ACTION_HIDE}"]`;
	const unhideButtonSelector = `button[data-tid="${NFT_COLLECTION_ACTION_UNHIDE}"]`;

	const mockToken: NonFungibleToken = {
		...AZUKI_ELEMENTAL_BEANS_TOKEN,
		network: POLYGON_MAINNET_NETWORK
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockAuthStore();

		erc721CustomTokensSpy = vi.spyOn(erc721CustomTokens, 'saveCustomTokens');
		erc721CustomTokensSpy.mockResolvedValue(undefined);
	});

	it('should render the spam and hide button', async () => {
		const { container } = render(NftCollectionActionButtons, {
			token: mockToken
		});

		await waitFor(() => {
			const spamButton: HTMLButtonElement | null = container.querySelector(spamButtonSelector);

			expect(spamButton).toBeInTheDocument();

			const hideButton: HTMLButtonElement | null = container.querySelector(hideButtonSelector);

			expect(hideButton).toBeInTheDocument();
		});
	});

	it('should render the spam and unhide button', async () => {
		const { container } = render(NftCollectionActionButtons, {
			token: { ...mockToken, section: CustomTokenSection.HIDDEN }
		});

		await waitFor(() => {
			const spamButton: HTMLButtonElement | null = container.querySelector(spamButtonSelector);

			expect(spamButton).toBeInTheDocument();

			const unhideButton: HTMLButtonElement | null = container.querySelector(unhideButtonSelector);

			expect(unhideButton).toBeInTheDocument();
		});
	});

	it('should render the not spam button', async () => {
		const { container } = render(NftCollectionActionButtons, {
			token: { ...mockToken, section: CustomTokenSection.SPAM }
		});

		await waitFor(() => {
			const notSpamButton: HTMLButtonElement | null =
				container.querySelector(notSpamButtonSelector);

			expect(notSpamButton).toBeInTheDocument();
		});
	});

	it('should save the token on hide button click', async () => {
		const { container } = render(NftCollectionActionButtons, {
			token: mockToken
		});

		await waitFor(() => {
			const hideButton: HTMLButtonElement | null = container.querySelector(hideButtonSelector);

			expect(hideButton).toBeInTheDocument();

			hideButton?.click();

			expect(erc721CustomTokensSpy).toHaveBeenCalledWith({
				tokens: [
					{
						...mockToken,
						enabled: true,
						section: CustomTokenSection.HIDDEN
					}
				],
				identity: mockIdentity
			});
		});
	});

	it('should set allowExternalContentSource to false on spam button click', async () => {
		const { container } = render(NftCollectionActionButtons, {
			token: mockToken
		});

		await waitFor(() => {
			const spamButton: HTMLButtonElement | null = container.querySelector(spamButtonSelector);

			expect(spamButton).toBeInTheDocument();

			spamButton?.click();

			expect(erc721CustomTokensSpy).toHaveBeenCalledWith({
				tokens: [
					{
						...mockToken,
						enabled: true,
						section: CustomTokenSection.SPAM,
						allowExternalContentSource: false
					}
				],
				identity: mockIdentity
			});
		});
	});
});
