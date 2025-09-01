import NftCollectionActionButtons from '$lib/components/nfts/NftCollectionActionButtons.svelte';
import { render, waitFor } from '@testing-library/svelte';
import { mapTokenToCollection } from '$lib/utils/nfts.utils';
import { AZUKI_ELEMENTAL_BEANS_TOKEN } from '$tests/mocks/erc721-tokens.mock';
import { erc721CustomTokensStore } from '$eth/stores/erc721-custom-tokens.store';
import {
	NFT_COLLECTION_ACTION_HIDE,
	NFT_COLLECTION_ACTION_NOT_SPAM,
	NFT_COLLECTION_ACTION_SPAM,
	NFT_COLLECTION_ACTION_UNHIDE
} from '$lib/constants/test-ids.constants';
import { POLYGON_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { CustomTokenSection } from '$lib/enums/custom-token-section';
import type { MockInstance } from 'vitest';
import * as erc721CustomTokens from '$eth/services/erc721-custom-tokens.services';
import { mockAuthStore } from '$tests/mocks/auth.mock';

describe('NftCollectionActionButtons', () => {
	let erc721CustomTokensSpy: MockInstance;

	const spamButtonSelector = `button[data-tid="${NFT_COLLECTION_ACTION_SPAM}"]`;
	const notSpamButtonSelector = `button[data-tid="${NFT_COLLECTION_ACTION_NOT_SPAM}"]`;
	const hideButtonSelector = `button[data-tid="${NFT_COLLECTION_ACTION_HIDE}"]`;
	const unhideButtonSelector = `button[data-tid="${NFT_COLLECTION_ACTION_UNHIDE}"]`;

	const mockCollection = mapTokenToCollection({
		...AZUKI_ELEMENTAL_BEANS_TOKEN,
		network: POLYGON_MAINNET_NETWORK
	});

	beforeEach(() => {
		vi.clearAllMocks();

		mockAuthStore()

		erc721CustomTokensStore.resetAll();

		erc721CustomTokensSpy = vi.spyOn(erc721CustomTokens, 'saveCustomTokens');
		erc721CustomTokensSpy.mockResolvedValue(undefined);
	});

	it('should render the spam and hide button', async () => {
		erc721CustomTokensStore.setAll([
			{
				data: {
					...{ ...AZUKI_ELEMENTAL_BEANS_TOKEN, network: POLYGON_MAINNET_NETWORK },
					enabled: true
				},
				certified: false
			}
		]);

		const { container } = render(NftCollectionActionButtons, {
			collection: mockCollection
		});

		await waitFor(() => {
			const spamButton: HTMLButtonElement | null = container.querySelector(spamButtonSelector);

			expect(spamButton).toBeInTheDocument();

			const hideButton: HTMLButtonElement | null = container.querySelector(hideButtonSelector);

			expect(hideButton).toBeInTheDocument();
		});
	});

	it('should render the spam and unhide button', async () => {
		erc721CustomTokensStore.setAll([
			{
				data: {
					...{ ...AZUKI_ELEMENTAL_BEANS_TOKEN, network: POLYGON_MAINNET_NETWORK },
					enabled: true,
					section: CustomTokenSection.HIDDEN
				},
				certified: false
			}
		]);

		const { container } = render(NftCollectionActionButtons, {
			collection: mockCollection
		});

		await waitFor(() => {
			const spamButton: HTMLButtonElement | null = container.querySelector(spamButtonSelector);

			expect(spamButton).toBeInTheDocument();

			const unhideButton: HTMLButtonElement | null = container.querySelector(unhideButtonSelector);

			expect(unhideButton).toBeInTheDocument();
		});
	});

	it('should render the not spam button', async () => {
		erc721CustomTokensStore.setAll([
			{
				data: {
					...{ ...AZUKI_ELEMENTAL_BEANS_TOKEN, network: POLYGON_MAINNET_NETWORK },
					enabled: true,
					section: CustomTokenSection.SPAM
				},
				certified: false
			}
		]);

		const { container } = render(NftCollectionActionButtons, {
			collection: mockCollection
		});

		await waitFor(() => {
			const notSpamButton: HTMLButtonElement | null = container.querySelector(notSpamButtonSelector);

			expect(notSpamButton).toBeInTheDocument();
		});
	});

	it('should save the token on button click', async () => {
		erc721CustomTokensStore.setAll([
			{
				data: {
					...{ ...AZUKI_ELEMENTAL_BEANS_TOKEN, network: POLYGON_MAINNET_NETWORK },
					enabled: true
				},
				certified: false
			}
		]);

		const { container } = render(NftCollectionActionButtons, {
			collection: mockCollection
		});

		await waitFor(() => {
			const spamButton: HTMLButtonElement | null = container.querySelector(spamButtonSelector);

			expect(spamButton).toBeInTheDocument();

			spamButton?.click();

			expect(erc721CustomTokensSpy).toHaveBeenCalled()
		});
	});
});