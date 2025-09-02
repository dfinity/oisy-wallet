import { POLYGON_AMOY_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import * as erc721TokenServices from '$eth/services/erc721-custom-tokens.services';
import type { Erc721Token } from '$eth/types/erc721';
import NftImageConsentModal from '$lib/components/nfts/NftImageConsentModal.svelte';
import * as authDerived from '$lib/derived/auth.derived';
import { i18n } from '$lib/stores/i18n.store';
import * as modalStoreMod from '$lib/stores/modal.store';
import { nftStore } from '$lib/stores/nft.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { NonFungibleToken } from '$lib/types/nft';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import * as nftsUtils from '$lib/utils/nfts.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { AZUKI_ELEMENTAL_BEANS_TOKEN } from '$tests/mocks/erc721-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockValidErc721Nft } from '$tests/mocks/nfts.mock';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { get, readable } from 'svelte/store';
import { beforeAll } from 'vitest';

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
	const saveSpy = vi.spyOn(erc721TokenServices, 'saveCustomTokens').mockResolvedValue(undefined);

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
		render(NftImageConsentModal, { props: { nft: nftAzuki1, testId: TEST_ID } });

		const saveBtn = screen.getByTestId(`${TEST_ID}-saveButton`);
		await fireEvent.click(saveBtn);

		expect(saveSpy).toHaveBeenCalledTimes(1);

		const arg = saveSpy.mock.calls[0][0];
		assertNonNullish(arg);

		expect(arg.tokens[0].allowExternalContentSource).toBe(false);
	});

	it('closes the modal when clicking Cancel', async () => {
		const TEST_ID = 'nft-modal';
		render(NftImageConsentModal, { props: { nft: nftAzuki1, testId: TEST_ID } });

		const cancelBtn = screen.getByTestId(`${TEST_ID}-cancelButton`);
		await fireEvent.click(cancelBtn);

		expect(closeSpy).toHaveBeenCalledTimes(1);
	});

	it('renders address, display preference, and NFT media list under the expected testIds', () => {
		getAllowMediaSpy.mockReturnValue(false);
		findTokenSpy.mockReturnValue(mockValidErc721Nft as unknown as NonFungibleToken);
		getCollectionUiSpy.mockReturnValue([
			{
				collection: nftAzuki1.collection,
				nfts: [nftAzuki1, nftAzuki2]
			}
		]);

		const TEST_ID = 'nft-modal';
		render(NftImageConsentModal, { props: { nft: nftAzuki1, testId: TEST_ID } });

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
	});
});
