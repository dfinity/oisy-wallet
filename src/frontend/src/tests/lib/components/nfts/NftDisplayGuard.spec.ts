import { POLYGON_AMOY_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import NftDisplayGuard from '$lib/components/nfts/NftDisplayGuard.svelte';
import { TRACK_NFT_OPEN_CONSENT_MODAL } from '$lib/constants/analytics.constants';
import {
	NFT_PLACEHOLDER_FILESIZE,
	NFT_PLACEHOLDER_INVALID,
	NFT_PLACEHOLDER_UNSUPPORTED
} from '$lib/constants/test-ids.constants';
import { modalNftImageConsent } from '$lib/derived/modal.derived';
import { NftMediaStatusEnum } from '$lib/schema/nft.schema';
import { trackEvent } from '$lib/services/analytics.services';
import { i18n } from '$lib/stores/i18n.store';
import * as nftsUtils from '$lib/utils/nfts.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { AZUKI_ELEMENTAL_BEANS_TOKEN } from '$tests/mocks/erc721-tokens.mock';
import { mockValidErc721Nft } from '$tests/mocks/nfts.mock';
import { mockSnippet, mockSnippetTestId } from '$tests/mocks/snippet.mock';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

const nftAzuki = {
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

describe('NftDisplayGuard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render the review consent when hasConsent is undefined', () => {
		vi.spyOn(nftsUtils, 'getAllowMediaForNft').mockReturnValue(undefined);

		const { getByRole, getByText } = render(NftDisplayGuard, {
			nft: nftAzuki,
			children: mockSnippet,
			showMessage: true,
			type: 'card'
		});

		const text = getByText(get(i18n).nfts.text.img_consent_none);

		assertNonNullish(text);

		const btn = getByRole('button');

		assertNonNullish(btn);

		expect(text).toBeInTheDocument();
		expect(btn).toBeInTheDocument();
	});

	it('should render the review consent with a different text when hasConsent is false', () => {
		vi.spyOn(nftsUtils, 'getAllowMediaForNft').mockReturnValue(false);

		const { getByRole, getByText } = render(NftDisplayGuard, {
			nft: nftAzuki,
			children: mockSnippet,
			showMessage: true,
			type: 'card'
		});

		const text = getByText(get(i18n).nfts.text.img_consent_disabled);

		assertNonNullish(text);

		const btn = getByRole('button');

		assertNonNullish(btn);

		expect(text).toBeInTheDocument();
		expect(btn).toBeInTheDocument();
	});

	it('should open the review consent modal when review is clicked', () => {
		vi.spyOn(nftsUtils, 'getAllowMediaForNft').mockReturnValue(undefined);

		const { getByRole } = render(NftDisplayGuard, {
			nft: nftAzuki,
			children: mockSnippet,
			showMessage: true,
			type: 'card'
		});

		const btn = getByRole('button');
		assertNonNullish(btn);

		expect(btn).toBeInTheDocument();

		fireEvent.click(btn);

		expect(get(modalNftImageConsent)).toBeTruthy();
	});

	it('should track event when consent modal is opened', () => {
		vi.spyOn(nftsUtils, 'getAllowMediaForNft').mockReturnValue(undefined);

		const { getByRole } = render(NftDisplayGuard, {
			nft: nftAzuki,
			children: mockSnippet,
			showMessage: true,
			type: 'card'
		});

		const btn = getByRole('button');

		assertNonNullish(btn);

		fireEvent.click(btn);

		expect(trackEvent).toHaveBeenCalledWith({
			name: TRACK_NFT_OPEN_CONSENT_MODAL,
			metadata: {
				collection_name: nftAzuki.collection.name,
				collection_address: nftAzuki.collection.address,
				network: nftAzuki.collection.network.name,
				standard: nftAzuki.collection.standard
			}
		});
	});

	it('should render the children if hasConsent is true', () => {
		vi.spyOn(nftsUtils, 'getAllowMediaForNft').mockReturnValue(true);

		const { queryAllByRole, queryByText, getByTestId } = render(NftDisplayGuard, {
			nft: nftAzuki,
			children: mockSnippet,
			showMessage: true,
			type: 'card'
		});

		expect(queryByText(get(i18n).nfts.text.img_consent_none)).not.toBeInTheDocument();
		expect(queryByText(get(i18n).nfts.text.img_consent_disabled)).not.toBeInTheDocument();

		expect(queryAllByRole('button')).toHaveLength(0);

		const children = getByTestId(mockSnippetTestId);

		expect(children).toBeInTheDocument();
	});

	it('should not show the text and button if showMessage is false', () => {
		vi.spyOn(nftsUtils, 'getAllowMediaForNft').mockReturnValue(false);

		const { queryAllByRole, queryByText } = render(NftDisplayGuard, {
			nft: nftAzuki,
			children: mockSnippet,
			showMessage: false,
			type: 'card'
		});

		expect(queryByText(get(i18n).nfts.text.img_consent_none)).not.toBeInTheDocument();
		expect(queryByText(get(i18n).nfts.text.img_consent_disabled)).not.toBeInTheDocument();

		expect(queryAllByRole('button')).toHaveLength(0);
	});

	it('should render the different placeholders if mediaStatus of nft is INVALID_DATA', () => {
		vi.spyOn(nftsUtils, 'getAllowMediaForNft').mockReturnValue(true);

		const { getByTestId } = render(NftDisplayGuard, {
			nft: { ...nftAzuki, mediaStatus: NftMediaStatusEnum.INVALID_DATA },
			children: mockSnippet,
			showMessage: false,
			type: 'card'
		});

		const placeholder = getByTestId(NFT_PLACEHOLDER_INVALID);

		expect(placeholder).toBeInTheDocument();
	});

	it('should render the different placeholders if mediaStatus of nft is FILESIZE_LIMIT_EXCEEDED', () => {
		vi.spyOn(nftsUtils, 'getAllowMediaForNft').mockReturnValue(true);

		const { getByTestId } = render(NftDisplayGuard, {
			nft: { ...nftAzuki, mediaStatus: NftMediaStatusEnum.FILESIZE_LIMIT_EXCEEDED },
			children: mockSnippet,
			showMessage: false,
			type: 'card'
		});

		const placeholder = getByTestId(NFT_PLACEHOLDER_FILESIZE);

		expect(placeholder).toBeInTheDocument();
	});

	it('should render the different placeholders if mediaStatus of nft is NON_SUPPORTED_MEDIA_TYPE', () => {
		vi.spyOn(nftsUtils, 'getAllowMediaForNft').mockReturnValue(true);

		const { getByTestId } = render(NftDisplayGuard, {
			nft: { ...nftAzuki, mediaStatus: NftMediaStatusEnum.NON_SUPPORTED_MEDIA_TYPE },
			children: mockSnippet,
			showMessage: false,
			type: 'card'
		});

		const placeholder = getByTestId(NFT_PLACEHOLDER_UNSUPPORTED);

		expect(placeholder).toBeInTheDocument();
	});
});
