import SendNftReview from '$lib/components/tokens/SendNftReview.svelte';
import { i18n } from '$lib/stores/i18n.store';
import { getNftDisplayName } from '$lib/utils/nft.utils';
import { mockValidErc721Nft } from '$tests/mocks/nfts.mock';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('SendNftReview', () => {
	it('renders the NFT name, id and network with the i18n send label', () => {
		const nft = mockValidErc721Nft;
		const sendLabel = get(i18n).send.text.send;

		const { getByText } = render(SendNftReview, { props: { nft } });

		// "Send: {displayName}"
		expect(getByText(`${sendLabel}: ${getNftDisplayName(nft)}`)).toBeInTheDocument();

		// Network name
		expect(getByText(nft.collection.network.name)).toBeInTheDocument();
	});

	it('does not duplicate the NFT id when the name already includes it', () => {
		const nft = {
			...mockValidErc721Nft,
			name: `${mockValidErc721Nft.name} #${mockValidErc721Nft.id}`
		};
		const sendLabel = get(i18n).send.text.send;

		const { getByText, queryByText } = render(SendNftReview, { props: { nft } });

		expect(getByText(`${sendLabel}: ${nft.name}`)).toBeInTheDocument();
		expect(queryByText(`${sendLabel}: ${nft.name} #${nft.id}`)).not.toBeInTheDocument();
	});
});
