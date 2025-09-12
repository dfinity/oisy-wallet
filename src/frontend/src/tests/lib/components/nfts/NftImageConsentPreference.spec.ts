import { POLYGON_AMOY_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import NftImageConsentPreference from '$lib/components/nfts/NftImageConsentPreference.svelte';
import { i18n } from '$lib/stores/i18n.store';
import * as modalStoreMod from '$lib/stores/modal.store';
import * as nftsUtils from '$lib/utils/nfts.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { AZUKI_ELEMENTAL_BEANS_TOKEN } from '$tests/mocks/erc721-tokens.mock';
import { mockValidErc721Nft } from '$tests/mocks/nfts.mock';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

const nftAzuki = {
	...mockValidErc721Nft,
	id: parseNftId(1),
	collection: {
		...mockValidErc721Nft.collection,
		name: 'Azuki Elemental Beans',
		address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
		network: POLYGON_AMOY_NETWORK
	}
};

describe('NftImageConsentPreference', () => {
	const getAllowMediaSpy = vi.spyOn(nftsUtils, 'getAllowMediaForNft');
	const openSpy = vi
		.spyOn(modalStoreMod.modalStore, 'openNftImageConsent')
		.mockImplementation(() => {});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders media_enabled text when hasConsent=true', () => {
		getAllowMediaSpy.mockReturnValue(true);

		const { getByText } = render(NftImageConsentPreference, { props: { nft: nftAzuki } });

		expect(getByText(get(i18n).nfts.text.media_enabled)).toBeInTheDocument();
	});

	it('renders media_disabled text when hasConsent=false', () => {
		getAllowMediaSpy.mockReturnValue(false);

		const { getByText } = render(NftImageConsentPreference, { props: { nft: nftAzuki } });

		expect(getByText(get(i18n).nfts.text.media_disabled)).toBeInTheDocument();
	});

	it('opens the consent modal with the collection when clicking the button', async () => {
		getAllowMediaSpy.mockReturnValue(true);

		const { getByRole } = render(NftImageConsentPreference, { props: { nft: nftAzuki } });

		const btn = getByRole('button', { name: get(i18n).nfts.text.review_preference });
		assertNonNullish(btn);

		await fireEvent.click(btn);

		expect(openSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				data: nftAzuki.collection,
				id: expect.any(Symbol)
			})
		);
	});
});
