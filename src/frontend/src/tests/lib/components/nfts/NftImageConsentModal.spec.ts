import { POLYGON_AMOY_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import NftImageConsentModal from '$lib/components/nfts/NftImageConsentModal.svelte'; // ⬅️ adjust path
import * as modalStoreMod from '$lib/stores/modal.store';
import { nftStore } from '$lib/stores/nft.store';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import * as nftsUtils from '$lib/utils/nfts.utils';
import * as tokensUtils from '$lib/utils/tokens.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { AZUKI_ELEMENTAL_BEANS_TOKEN } from '$tests/mocks/erc721-tokens.mock';
import { mockValidErc721Nft } from '$tests/mocks/nfts.mock';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { get } from 'svelte/store';
import { beforeAll } from 'vitest';

const nftAzuki1 = {
	...mockValidErc721Nft,
	id: parseNftId(1),
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
	const saveSpy = vi.spyOn(tokensUtils, 'saveAllCustomTokens').mockResolvedValue(undefined);

	// NFT utils: toggle & collection
	const getAllowMediaSpy = vi.spyOn(nftsUtils, 'getAllowMediaForNft');
	const findTokenSpy = vi.spyOn(nftsUtils, 'findNonFungibleToken');
	const getCollectionUiSpy = vi.spyOn(nftsUtils, 'getNftCollectionUi');

	beforeAll(() => {
		nftStore.addAll([nftAzuki1, nftAzuki2]);
	});

	it('calls saveAllCustomTokens with toggled allowMedia and correct key on Save', async () => {
		// hasConsent TRUE -> button label "Disable media" -> we expect toggled to FALSE
		getAllowMediaSpy.mockReturnValue(true);

		// token found for the collection
		const token = {
			id: { description: 'token-123' },
			network: { id: { description: 'net-icp' } },
			allowMedia: true
		} as const;
		findTokenSpy.mockReturnValue(token as never);

		const TEST_ID = 'nft-modal';
		render(NftImageConsentModal, { props: { nft: nftAzuki1, testId: TEST_ID } });

		// Click save
		const saveBtn = screen.getByTestId(`${TEST_ID}-saveButton`);
		await fireEvent.click(saveBtn);

		// Expect save util called once with toggled allowMedia = false
		expect(saveSpy).toHaveBeenCalledTimes(1);

		const arg = saveSpy.mock.calls[0][0];
		assertNonNullish(arg);

		// tokens key
		const expectedKey = `${token.id.description}-${token.network.id.description}`;
		expect(Object.keys(arg.tokens)).toContain(expectedKey);

		// toggled allowMedia
		expect(arg.tokens[expectedKey].allowMedia).toBe(false);

		// onSuccess is modalStore.close
		expect(arg.onSuccess).toBe(modalStoreMod.modalStore.close);
	});

	it('closes the modal when clicking Cancel', async () => {
		// consent can be anything; not relevant
		getAllowMediaSpy.mockReturnValue(false);
		findTokenSpy.mockReturnValue(undefined as never);
		getCollectionUiSpy.mockReturnValue([] as never);

		const TEST_ID = 'nft-modal';
		render(NftImageConsentModal, { props: { nft: nftAzuki1, testId: TEST_ID } });

		const cancelBtn = screen.getByTestId(`${TEST_ID}-cancelButton`);
		await fireEvent.click(cancelBtn);

		expect(closeSpy).toHaveBeenCalledTimes(1);
	});

	it('renders address, display preference, and NFT media list under the expected testIds', () => {
		// hasConsent FALSE -> display shows "Disabled" and Save button text "Enable media"
		getAllowMediaSpy.mockReturnValue(false);

		const token = {
			id: { description: 'token-xyz' },
			network: { id: { description: 'net-icp' } }
		} as const;
		findTokenSpy.mockReturnValue(token as never);

		const TEST_ID = 'nft-modal';
		render(NftImageConsentModal, { props: { nft: nftAzuki1, testId: TEST_ID } });

		// Address (shortened) — compute the expected via the same util
		const addrOut = screen.getByTestId(`${TEST_ID}-collectionAddress`);
		const expectedShortAddr = shortenWithMiddleEllipsis({ text: nftAzuki1.collection.address });
		expect(addrOut).toHaveTextContent(expectedShortAddr);

		// Display preference: find the label by testId, then check the sibling value
		const prefLabel = screen.getByTestId(`${TEST_ID}-displayPreferences`);
		assertNonNullish(prefLabel.parentElement);
		const valueSpan = prefLabel.parentElement.querySelector('span:last-child');
		assertNonNullish(valueSpan);
		expect(valueSpan).toHaveTextContent('Disabled');

		// NFT media list: only items with imageUrl appear (2 of them)
		const mediaContainer = screen.getByTestId(`${TEST_ID}-nfts-media`);
		const utils = within(mediaContainer);

		// Each row includes "#<id>" and a shortened URL
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
	});
});
