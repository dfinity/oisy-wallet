import { POLYGON_AMOY_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import NftDisplayGuard from '$lib/components/nfts/NftDisplayGuard.svelte';
import {
	NFT_PLACEHOLDER_FILESIZE,
	NFT_PLACEHOLDER_INVALID,
	NFT_PLACEHOLDER_UNSUPPORTED
} from '$lib/constants/test-ids.constants';
import { modalNftImageConsent } from '$lib/derived/modal.derived';
import { PLAUSIBLE_EVENTS, PLAUSIBLE_EVENT_SOURCES } from '$lib/enums/plausible';
import { NftMediaStatusEnum } from '$lib/schema/nft.schema';
import { trackEvent } from '$lib/services/analytics.services';
import { i18n } from '$lib/stores/i18n.store';
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

const getNftAzuki = (allowMedia?: boolean) => ({
	...mockValidErc721Nft,
	id: parseNftId('1'),
	imageUrl: 'https://ipfs.io/ipfs/QmUYeQEm8FquanaaiGKkubmvRwKLnMV8T3c4Ph9Eoup9Gy/1.png',
	collection: {
		...mockValidErc721Nft.collection,
		name: 'Azuki Elemental Beans',
		address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
		network: POLYGON_AMOY_NETWORK,
		allowExternalContentSource: allowMedia
	}
});

describe('NftDisplayGuard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render the review consent when hasConsent is undefined', () => {
		const { getByRole, getByText } = render(NftDisplayGuard, {
			nft: getNftAzuki(),
			children: mockSnippet,
			showMessage: true,
			type: 'card',
			location: { source: PLAUSIBLE_EVENT_SOURCES.NFT_COLLECTION, subSource: 'card' }
		});

		const text = getByText(get(i18n).nfts.text.img_consent_none);

		assertNonNullish(text);

		const btn = getByRole('button');

		assertNonNullish(btn);

		expect(text).toBeInTheDocument();
		expect(btn).toBeInTheDocument();
	});

	it('should render the review consent with a different text when hasConsent is false', () => {
		const { getByRole, getByText } = render(NftDisplayGuard, {
			nft: getNftAzuki(false),
			children: mockSnippet,
			showMessage: true,
			type: 'card',
			location: { source: PLAUSIBLE_EVENT_SOURCES.NFT_COLLECTION, subSource: 'card' }
		});

		const text = getByText(get(i18n).nfts.text.img_consent_disabled);

		assertNonNullish(text);

		const btn = getByRole('button');

		assertNonNullish(btn);

		expect(text).toBeInTheDocument();
		expect(btn).toBeInTheDocument();
	});

	it('should open the review consent modal when review is clicked', () => {
		const { getByRole } = render(NftDisplayGuard, {
			nft: getNftAzuki(),
			children: mockSnippet,
			showMessage: true,
			type: 'card',
			location: { source: PLAUSIBLE_EVENT_SOURCES.NFT_COLLECTION, subSource: 'card' }
		});

		const btn = getByRole('button');
		assertNonNullish(btn);

		expect(btn).toBeInTheDocument();

		fireEvent.click(btn);

		expect(get(modalNftImageConsent)).toBeTruthy();
	});

	it('should track event when consent modal is opened', () => {
		const { getByRole } = render(NftDisplayGuard, {
			nft: getNftAzuki(),
			children: mockSnippet,
			showMessage: true,
			type: 'card',
			location: { source: PLAUSIBLE_EVENT_SOURCES.NFT_COLLECTION, subSource: 'card' }
		});

		const btn = getByRole('button');

		assertNonNullish(btn);

		fireEvent.click(btn);

		expect(trackEvent).toHaveBeenCalledWith({
			name: PLAUSIBLE_EVENTS.OPEN_MODAL,
			metadata: {
				event_context: 'nft',
				event_subcontext: 'media_review',
				location_source: PLAUSIBLE_EVENT_SOURCES.NFT_COLLECTION,
				location_subsource: 'card',
				token_address: '0x41E54Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
				token_name: 'Azuki Elemental Beans',
				token_network: 'Polygon (Amoy Testnet)',
				token_standard: 'erc721'
			}
		});
	});

	it('should render the children if hasConsent is true', () => {
		const { queryAllByRole, queryByText, getByTestId } = render(NftDisplayGuard, {
			nft: getNftAzuki(true),
			children: mockSnippet,
			showMessage: true,
			type: 'card',
			location: { source: PLAUSIBLE_EVENT_SOURCES.NFT_COLLECTION, subSource: 'card' }
		});

		expect(queryByText(get(i18n).nfts.text.img_consent_none)).not.toBeInTheDocument();
		expect(queryByText(get(i18n).nfts.text.img_consent_disabled)).not.toBeInTheDocument();

		expect(queryAllByRole('button')).toHaveLength(0);

		const children = getByTestId(mockSnippetTestId);

		expect(children).toBeInTheDocument();
	});

	it('should not show the text and button if showMessage is false', () => {
		const { queryAllByRole, queryByText } = render(NftDisplayGuard, {
			nft: getNftAzuki(false),
			children: mockSnippet,
			showMessage: false,
			type: 'card',
			location: { source: PLAUSIBLE_EVENT_SOURCES.NFT_COLLECTION, subSource: 'card' }
		});

		expect(queryByText(get(i18n).nfts.text.img_consent_none)).not.toBeInTheDocument();
		expect(queryByText(get(i18n).nfts.text.img_consent_disabled)).not.toBeInTheDocument();

		expect(queryAllByRole('button')).toHaveLength(0);
	});

	it('should render the different placeholders if mediaStatus of nft is INVALID_DATA', () => {
		const { getByTestId } = render(NftDisplayGuard, {
			nft: {
				...getNftAzuki(true),
				mediaStatus: {
					image: NftMediaStatusEnum.INVALID_DATA,
					thumbnail: NftMediaStatusEnum.INVALID_DATA
				}
			},
			children: mockSnippet,
			showMessage: false,
			type: 'card',
			location: { source: PLAUSIBLE_EVENT_SOURCES.NFT_COLLECTION, subSource: 'card' }
		});

		const placeholder = getByTestId(NFT_PLACEHOLDER_INVALID);

		expect(placeholder).toBeInTheDocument();
	});

	it('should render the different placeholders if mediaStatus of nft is FILESIZE_LIMIT_EXCEEDED', () => {
		const { getByTestId } = render(NftDisplayGuard, {
			nft: {
				...getNftAzuki(true),
				mediaStatus: {
					image: NftMediaStatusEnum.FILESIZE_LIMIT_EXCEEDED,
					thumbnail: NftMediaStatusEnum.INVALID_DATA
				}
			},
			children: mockSnippet,
			showMessage: false,
			type: 'card',
			location: { source: PLAUSIBLE_EVENT_SOURCES.NFT_COLLECTION, subSource: 'card' }
		});

		const placeholder = getByTestId(NFT_PLACEHOLDER_FILESIZE);

		expect(placeholder).toBeInTheDocument();
	});

	it('should render the different placeholders if mediaStatus of nft is NON_SUPPORTED_MEDIA_TYPE', () => {
		const { getByTestId } = render(NftDisplayGuard, {
			nft: {
				...getNftAzuki(true),
				mediaStatus: {
					image: NftMediaStatusEnum.NON_SUPPORTED_MEDIA_TYPE,
					thumbnail: NftMediaStatusEnum.INVALID_DATA
				}
			},
			children: mockSnippet,
			showMessage: false,
			type: 'card',
			location: { source: PLAUSIBLE_EVENT_SOURCES.NFT_COLLECTION, subSource: 'card' }
		});

		const placeholder = getByTestId(NFT_PLACEHOLDER_UNSUPPORTED);

		expect(placeholder).toBeInTheDocument();
	});
});
