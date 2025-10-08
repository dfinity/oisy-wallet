import { POLYGON_AMOY_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import * as erc721TokenServices from '$eth/services/erc721-custom-tokens.services';
import type { Erc721Token } from '$eth/types/erc721';
import NftImageConsentModal from '$lib/components/nfts/NftImageConsentModal.svelte';
import {
	NFT_COLLECTION_ACTION_HIDE,
	NFT_COLLECTION_ACTION_SPAM
} from '$lib/constants/test-ids.constants';
import * as authDerived from '$lib/derived/auth.derived';
import { i18n } from '$lib/stores/i18n.store';
import * as modalStoreMod from '$lib/stores/modal.store';
import { nftStore } from '$lib/stores/nft.store';
import type { OptionIdentity } from '$lib/types/identity';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import * as nftsUtils from '$lib/utils/nfts.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { AZUKI_ELEMENTAL_BEANS_TOKEN, mockValidErc721Token } from '$tests/mocks/erc721-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockValidErc721Nft } from '$tests/mocks/nfts.mock';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { get, readable } from 'svelte/store';


const nftAzuki1 = {
	...mockValidErc721Nft,
	id: parseNftId(1),
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
	id: parseNftId(2),
	imageUrl: 'https://ipfs.io/ipfs/QmUYeQEm8FquanaaiGKkubmvRwKLnMV8T3c4Ph9Eoup9Gy/2.png',
	collection: {
		...mockValidErc721Nft.collection,
		name: 'Azuki Elemental Beans',
		address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
		network: POLYGON_AMOY_NETWORK
	}
};

describe('NftImageConsentModal', () => {
	// modal store close
	const closeSpy = vi.spyOn(modalStoreMod.modalStore, 'close').mockImplementation(() => {});

	// save util
	const saveSpy = vi
		.spyOn(erc721TokenServices, 'saveCustomTokens')
		.mockReturnValue(new Promise((resolve) => resolve()));

	// NFT utils: toggle & collection
	const getAllowMediaSpy = vi.spyOn(nftsUtils, 'getAllowMediaForNft');
	const findTokenSpy = vi.spyOn(nftsUtils, 'findNonFungibleToken');
	const getCollectionUiSpy = vi.spyOn(nftsUtils, 'getNftCollectionUi');

	vi.spyOn(authDerived, 'authIdentity', 'get').mockReturnValue(
		readable(mockIdentity as unknown as OptionIdentity)
	);

	beforeAll(() => {
		nftStore.addAll([nftAzuki1, nftAzuki2]);
	});

	beforeEach(() => {
		getAllowMediaSpy.mockClear();
		closeSpy.mockClear();
	});

	it('calls saveAllCustomTokens with toggled allowMedia and correct key on Save', async () => {
		getAllowMediaSpy.mockReturnValue(true);

		const token = {
			id: { description: 'token-123' },
			network: { id: { description: 'net-icp' } },
			allowExternalContentSource: true,
			standard: 'erc721'
		} as Erc721Token;
		findTokenSpy.mockReturnValue(token);

		const TEST_ID = 'nft-modal';
		render(NftImageConsentModal, { props: { collection: nftAzuki1.collection, testId: TEST_ID } });

		const saveBtn = screen.getByTestId(`${TEST_ID}-saveButton`);
		await fireEvent.click(saveBtn);

		expect(saveSpy).toHaveBeenCalledWith({
			identity: mockIdentity,
			tokens: [{ ...token, allowExternalContentSource: false, enabled: true }]
		});

		expect(closeSpy).toHaveBeenCalledOnce();
	});

	it('calls saveAllCustomTokens to set allowMedia to false to keep disabled', async () => {
		getAllowMediaSpy.mockReturnValue(undefined);

		const token = {
			id: { description: 'token-123' },
			network: { id: { description: 'net-icp' } },
			allowExternalContentSource: true,
			standard: 'erc721'
		} as Erc721Token;
		findTokenSpy.mockReturnValue(token);

		const TEST_ID = 'nft-modal';
		render(NftImageConsentModal, { props: { collection: nftAzuki1.collection, testId: TEST_ID } });

		const keepDisabledBtn = screen.getByTestId(`${TEST_ID}-keepMediaDisabledButton`);
		await fireEvent.click(keepDisabledBtn);

		expect(saveSpy).toHaveBeenCalledWith({
			identity: mockIdentity,
			tokens: [{ ...token, allowExternalContentSource: false, enabled: true }]
		});

		expect(closeSpy).toHaveBeenCalledOnce();
	});

	it('closes the modal when clicking Cancel', async () => {
		getAllowMediaSpy.mockReturnValue(true);

		const TEST_ID = 'nft-modal';
		render(NftImageConsentModal, { props: { collection: nftAzuki1.collection, testId: TEST_ID } });

		const cancelBtn1 = screen.getByTestId(`${TEST_ID}-cancelButton`);

		assertNonNullish(cancelBtn1);

		getAllowMediaSpy.mockReturnValue(false);

		const cancelBtn2 = screen.getByTestId(`${TEST_ID}-cancelButton`);

		assertNonNullish(cancelBtn2);

		await fireEvent.click(cancelBtn2);

		expect(closeSpy).toHaveBeenCalledOnce();
	});

	it('renders collection info, display preference, and NFT media list', () => {
		getAllowMediaSpy.mockReturnValue(false);
		findTokenSpy.mockReturnValue({
			...mockValidErc721Token,
			description: 'Some valid description'
		});
		getCollectionUiSpy.mockReturnValue([
			{
				collection: { ...nftAzuki1.collection, description: 'Some valid description' },
				nfts: [nftAzuki1, nftAzuki2]
			}
		]);

		const TEST_ID = 'nft-modal';
		render(NftImageConsentModal, {
			props: {
				collection: { ...nftAzuki1.collection, description: 'Some valid description' },
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
		getAllowMediaSpy.mockReturnValue(false);
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
			expect(icons.querySelector('a')).not.toBeInTheDocument();
		});
	});

	it('should render media link icon if consent has been given', () => {
		getAllowMediaSpy.mockReturnValue(true);
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
});
