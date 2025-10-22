import { POLYGON_AMOY_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import * as erc721TokenServices from '$eth/services/erc721-custom-tokens.services';
import type { Erc721Token } from '$eth/types/erc721';
import NftImageConsentModal from '$lib/components/nfts/NftImageConsentModal.svelte';
import {
	NFT_COLLECTION_ACTION_HIDE,
	NFT_COLLECTION_ACTION_SPAM
} from '$lib/constants/test-ids.constants';
import * as authDerived from '$lib/derived/auth.derived';
import { CustomTokenSection } from '$lib/enums/custom-token-section';
import { PLAUSIBLE_EVENTS } from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import { i18n } from '$lib/stores/i18n.store';
import { nftStore } from '$lib/stores/nft.store';
import type { OptionIdentity } from '$lib/types/identity';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import * as nftsUtils from '$lib/utils/nfts.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { AZUKI_ELEMENTAL_BEANS_TOKEN, mockValidErc721Token } from '$tests/mocks/erc721-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockValidErc721Nft } from '$tests/mocks/nfts.mock';
import { assertNonNullish, nonNullish } from '@dfinity/utils';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { get, readable } from 'svelte/store';

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

const nftAzuki1 = {
	...mockValidErc721Nft,
	id: parseNftId('1'),
	imageUrl: 'https://ipfs.io/ipfs/QmUYeQEm8FquanaaiGKkubmvRwKLnMV8T3c4Ph9Eoup9Gy/1.png',
	collection: {
		...mockValidErc721Nft.collection,
		name: 'Azuki Elemental Beans',
		address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
		network: POLYGON_AMOY_NETWORK
	}
};

const nftAzuki2 = {
	...mockValidErc721Nft,
	id: parseNftId('2'),
	imageUrl: 'https://ipfs.io/ipfs/QmUYeQEm8FquanaaiGKkubmvRwKLnMV8T3c4Ph9Eoup9Gy/2.png',
	collection: {
		...mockValidErc721Nft.collection,
		name: 'Azuki Elemental Beans',
		address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
		network: POLYGON_AMOY_NETWORK
	}
};

describe('NftImageConsentModal', () => {
	// save util
	const saveSpy = vi
		.spyOn(erc721TokenServices, 'saveCustomTokens')
		.mockReturnValue(new Promise((resolve) => resolve()));

	// NFT utils: toggle & collection
	const findTokenSpy = vi.spyOn(nftsUtils, 'findNonFungibleToken');
	const getCollectionUiSpy = vi.spyOn(nftsUtils, 'getNftCollectionUi');

	vi.spyOn(authDerived, 'authIdentity', 'get').mockReturnValue(
		readable(mockIdentity as unknown as OptionIdentity)
	);

	beforeAll(() => {
		nftStore.addAll([nftAzuki1, nftAzuki2]);
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	const TEST_ID = 'nft-modal';

	const testIds = {
		keepDisabled: `${TEST_ID}-keepDisabledButton`,
		keepEnabled: `${TEST_ID}-keepEnabledButton`,
		enable: `${TEST_ID}-enableButton`,
		disable: `${TEST_ID}-disableButton`
	};

	const testCases = [
		{
			description: 'Case allow media undefined',
			buttonSecondary: testIds.keepDisabled,
			buttonSecondarySaveCalledWith: false,
			buttonPrimary: testIds.enable,
			buttonPrimarySaveCalledWith: true,
			allowMedia: undefined
		},
		{
			description: 'Case allow media false',
			buttonSecondary: testIds.keepDisabled,
			buttonSecondarySaveCalledWith: undefined,
			buttonPrimary: testIds.enable,
			buttonPrimarySaveCalledWith: true,
			allowMedia: false
		},
		{
			description: 'Case allow media true',
			buttonSecondary: testIds.disable,
			buttonSecondarySaveCalledWith: false,
			buttonPrimary: testIds.keepEnabled,
			buttonPrimarySaveCalledWith: undefined,
			allowMedia: true
		}
	];

	it.each(testCases)(
		'$description should render correct buttons with actions',
		async (testCase) => {
			const token = {
				id: { description: 'token-123' },
				network: { id: { description: 'net-icp' } },
				allowExternalContentSource: true,
				standard: 'erc721'
			} as Erc721Token;

			findTokenSpy.mockReturnValue(token);

			render(NftImageConsentModal, {
				props: {
					collection: { ...nftAzuki1.collection, allowExternalContentSource: testCase.allowMedia },
					testId: TEST_ID
				}
			});

			const btnPrimary = screen.getByTestId(testCase.buttonPrimary);
			const btnSecondary = screen.getByTestId(testCase.buttonSecondary);

			expect(btnPrimary).toBeInTheDocument();
			expect(btnSecondary).toBeInTheDocument();

			if (nonNullish(testCase.buttonPrimarySaveCalledWith)) {
				await fireEvent.click(btnPrimary);

				expect(saveSpy).toHaveBeenCalledWith({
					identity: mockIdentity,
					tokens: [
						{
							...token,
							allowExternalContentSource: testCase.buttonPrimarySaveCalledWith,
							enabled: true
						}
					]
				});
			}

			if (nonNullish(testCase.buttonSecondarySaveCalledWith)) {
				await fireEvent.click(btnSecondary);

				expect(saveSpy).toHaveBeenCalledWith({
					identity: mockIdentity,
					tokens: [
						{
							...token,
							allowExternalContentSource: testCase.buttonSecondarySaveCalledWith,
							enabled: true
						}
					]
				});
			}
		}
	);

	it('should disable the primary button if collection is spam', async () => {
		const token = {
			id: { description: 'token-123' },
			network: { id: { description: 'net-icp' } },
			allowExternalContentSource: true,
			standard: 'erc721',
			section: CustomTokenSection.SPAM
		} as Erc721Token;

		findTokenSpy.mockReturnValue(token);

		render(NftImageConsentModal, {
			props: {
				collection: { ...nftAzuki1.collection, allowExternalContentSource: undefined },
				testId: TEST_ID
			}
		});

		const btnPrimary = screen.getByTestId(`${TEST_ID}-enableButton`);

		await waitFor(() => {
			expect(btnPrimary).toBeDisabled();
		});
	});

	it('renders collection info, display preference, and NFT media list', () => {
		findTokenSpy.mockReturnValue({
			...mockValidErc721Token,
			description: 'Some valid description'
		});
		getCollectionUiSpy.mockReturnValue([
			{
				collection: {
					...nftAzuki1.collection,
					description: 'Some valid description',
					allowExternalContentSource: false
				},
				nfts: [nftAzuki1, nftAzuki2]
			}
		]);

		const TEST_ID = 'nft-modal';
		render(NftImageConsentModal, {
			props: {
				collection: {
					...nftAzuki1.collection,
					description: 'Some valid description',
					allowExternalContentSource: false
				},
				testId: TEST_ID
			}
		});

		// Collection address
		const addrOut = screen.getByTestId(`${TEST_ID}-collectionAddress`);
		const expectedShortAddr = shortenWithMiddleEllipsis({ text: nftAzuki1.collection.address });

		expect(addrOut).toHaveTextContent(expectedShortAddr);

		// Display preference
		const prefLabel = screen.getByTestId(`${TEST_ID}-displayPreferences`);
		assertNonNullish(prefLabel.parentElement);
		const valueSpan = prefLabel.parentElement.querySelector('span:last-child');
		assertNonNullish(valueSpan);

		expect(valueSpan).toHaveTextContent(get(i18n).nfts.text.media_disabled);

		// NFT media list
		const mediaContainer = screen.getByTestId(`${TEST_ID}-nfts-media`);
		const utils = within(mediaContainer);

		for (const nft of get(nftStore) ?? []) {
			if (nft.imageUrl) {
				const idText = `#${nft.id}`;

				expect(utils.getByText(idText)).toBeInTheDocument();

				const shortenedUrl = shortenWithMiddleEllipsis({ text: nft.imageUrl, splitLength: 20 });

				expect(utils.getByText(shortenedUrl)).toBeInTheDocument();
			} else {
				// Rows without imageUrl should not appear
				expect(utils.queryByText(`#${nft.id}`)).toBeNull();
			}
		}

		// Collection data and actions
		const colTitle = screen.getByTestId(`${TEST_ID}-collectionTitle`);
		const colDescription = screen.getByTestId(`${TEST_ID}-collectionDescription`);
		const spamButton = screen.getByTestId(NFT_COLLECTION_ACTION_SPAM);
		const hideButton = screen.getByTestId(NFT_COLLECTION_ACTION_HIDE);

		expect(colTitle).toBeInTheDocument();
		expect(colDescription).toBeInTheDocument();
		expect(spamButton).toBeInTheDocument();
		expect(hideButton).toBeInTheDocument();
	});

	it('should not render media link icon if consent has not been given', () => {
		findTokenSpy.mockReturnValue(mockValidErc721Token);
		getCollectionUiSpy.mockReturnValue([
			{
				collection: nftAzuki1.collection,
				nfts: [nftAzuki1, nftAzuki2]
			}
		]);

		const TEST_ID = 'nft-modal';
		render(NftImageConsentModal, {
			props: {
				collection: { ...nftAzuki1.collection, allowExternalContentSource: false },
				testId: TEST_ID
			}
		});

		const mediaContainer = screen.getByTestId(`${TEST_ID}-nfts-media`);

		mediaContainer.querySelectorAll('span.float-right').forEach((icons) => {
			// copy button
			expect(icons.querySelector('button')).toBeInTheDocument();
			// open in explorer link
			expect(icons.querySelector('a')).not.toBeInTheDocument();
		});
	});

	it('should render media link icon if consent has been given', () => {
		findTokenSpy.mockReturnValue(mockValidErc721Token);
		getCollectionUiSpy.mockReturnValue([
			{
				collection: nftAzuki1.collection,
				nfts: [nftAzuki1, nftAzuki2]
			}
		]);

		const TEST_ID = 'nft-modal';
		render(NftImageConsentModal, {
			props: { collection: nftAzuki1.collection, testId: TEST_ID }
		});

		const mediaContainer = screen.getByTestId(`${TEST_ID}-nfts-media`);

		mediaContainer.querySelectorAll('span.float-right').forEach((icons) => {
			// copy button
			expect(icons.querySelector('button')).toBeInTheDocument();
			// open in explorer link
			expect(icons.querySelector('a')).toBeInTheDocument();
		});
	});

	it('should track event with "enable_media" when enable button is clicked', async () => {
		const token = {
			id: { description: 'token-123' },
			network: { id: { description: 'base' } },
			allowExternalContentSource: false,
			standard: 'erc721'
		} as Erc721Token;

		findTokenSpy.mockReturnValue(token);

		render(NftImageConsentModal, {
			props: {
				collection: { ...nftAzuki1.collection, allowExternalContentSource: false },
				testId: TEST_ID
			}
		});

		const enableButton = screen.getByTestId(testIds.enable);
		await fireEvent.click(enableButton);

		expect(trackEvent).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.MEDIA_CONSENT,
			metadata: {
				event_context: 'nft',
				event_value: 'true',
				token_address: '0x41E54Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
				token_name: 'Azuki Elemental Beans',
				token_network: 'Polygon (Amoy Testnet)',
				token_standard: 'erc721'
			}
		});
	});

	it('should track event with "keep_media_disabled" when keep disabled button is clicked', async () => {
		const token = {
			id: { description: 'token-123' },
			network: { id: { description: 'base' } },
			allowExternalContentSource: false,
			standard: 'erc721'
		} as Erc721Token;

		findTokenSpy.mockReturnValue(token);

		render(NftImageConsentModal, {
			props: {
				collection: { ...nftAzuki1.collection, allowExternalContentSource: false },
				testId: TEST_ID
			}
		});

		const keepDisabledButton = screen.getByTestId(testIds.keepDisabled);
		await fireEvent.click(keepDisabledButton);

		expect(trackEvent).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.MEDIA_CONSENT,
			metadata: {
				event_context: 'nft',
				event_value: 'false',
				token_address: '0x41E54Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
				token_name: 'Azuki Elemental Beans',
				token_network: 'Polygon (Amoy Testnet)',
				token_standard: 'erc721'
			}
		});
	});

	it('should track event with "disable_media" when disable button is clicked', async () => {
		const token = {
			id: { description: 'token-123' },
			network: { id: { description: 'base' } },
			allowExternalContentSource: true,
			standard: 'erc721'
		} as Erc721Token;

		findTokenSpy.mockReturnValue(token);

		render(NftImageConsentModal, {
			props: { collection: nftAzuki1.collection, testId: TEST_ID }
		});

		const disableButton = screen.getByTestId(testIds.disable);
		await fireEvent.click(disableButton);

		expect(trackEvent).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.MEDIA_CONSENT,
			metadata: {
				event_context: 'nft',
				event_value: 'false',
				token_address: '0x41E54Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
				token_name: 'Azuki Elemental Beans',
				token_network: 'Polygon (Amoy Testnet)',
				token_standard: 'erc721'
			}
		});
	});

	it('should track event with "keep_media_enabled" when keep enabled button is clicked', async () => {
		const token = {
			id: { description: 'token-123' },
			network: { id: { description: 'base' } },
			allowExternalContentSource: true,
			standard: 'erc721'
		} as Erc721Token;

		findTokenSpy.mockReturnValue(token);

		render(NftImageConsentModal, {
			props: { collection: nftAzuki1.collection, testId: TEST_ID }
		});

		const keepEnabledButton = screen.getByTestId(testIds.keepEnabled);
		await fireEvent.click(keepEnabledButton);

		expect(trackEvent).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.MEDIA_CONSENT,
			metadata: {
				event_context: 'nft',
				event_value: 'true',
				token_address: '0x41E54Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
				token_name: 'Azuki Elemental Beans',
				token_network: 'Polygon (Amoy Testnet)',
				token_standard: 'erc721'
			}
		});
	});
});
