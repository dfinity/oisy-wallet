import { POLYGON_AMOY_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import NftImageConsent from '$lib/components/nfts/NftImageConsent.svelte';
import { modalNftImageConsent } from '$lib/derived/modal.derived';
import { i18n } from '$lib/stores/i18n.store';
import * as nftsUtils from '$lib/utils/nfts.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { AZUKI_ELEMENTAL_BEANS_TOKEN } from '$tests/mocks/erc721-tokens.mock';
import { mockValidErc721Nft } from '$tests/mocks/nfts.mock';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

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

describe('NftImageConsent', () => {
	it('should render the review consent when hasConsent is undefined', () => {
		vi.spyOn(nftsUtils, 'getAllowMediaForNft').mockReturnValue(undefined);

		const { getByRole, getByText } = render(NftImageConsent, {
			nft: nftAzuki,
			children: createMockSnippet('children'),
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

		const { getByRole, getByText } = render(NftImageConsent, {
			nft: nftAzuki,
			children: createMockSnippet('children'),
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

		const { getByRole } = render(NftImageConsent, {
			nft: nftAzuki,
			children: createMockSnippet('children'),
			showMessage: true,
			type: 'card'
		});

		const btn = getByRole('button');
		assertNonNullish(btn);

		expect(btn).toBeInTheDocument();

		fireEvent.click(btn);

		expect(get(modalNftImageConsent)).toBeTruthy();
	});

	it('should render the children if hasConsent is true', () => {
		vi.spyOn(nftsUtils, 'getAllowMediaForNft').mockReturnValue(true);

		const { queryAllByRole, queryByText, getByTestId } = render(NftImageConsent, {
			nft: nftAzuki,
			children: createMockSnippet('children'),
			showMessage: true,
			type: 'card'
		});

		expect(queryByText(get(i18n).nfts.text.img_consent_none)).not.toBeInTheDocument();
		expect(queryByText(get(i18n).nfts.text.img_consent_disabled)).not.toBeInTheDocument();

		expect(queryAllByRole('button')).toHaveLength(0);

		const children = getByTestId('children');

		expect(children).toBeInTheDocument();
	});

	it('should not show the text and button if showMessage is false', () => {
		vi.spyOn(nftsUtils, 'getAllowMediaForNft').mockReturnValue(false);

		const { queryAllByRole, queryByText } = render(NftImageConsent, {
			nft: nftAzuki,
			children: createMockSnippet('children'),
			showMessage: false,
			type: 'card'
		});

		expect(queryByText(get(i18n).nfts.text.img_consent_none)).not.toBeInTheDocument();
		expect(queryByText(get(i18n).nfts.text.img_consent_disabled)).not.toBeInTheDocument();

		expect(queryAllByRole('button')).toHaveLength(0);
	});
});
