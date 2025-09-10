import SendNftReview from '$lib/components/tokens/SendNftReview.svelte';
import { i18n } from '$lib/stores/i18n.store';
import { mockValidErc721Nft } from '$tests/mocks/nfts.mock';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('SendNftReview', () => {
	it('renders the NFT name, id and network with the i18n send label', () => {
		const nft = mockValidErc721Nft;
		const sendLabel = get(i18n).send.text.send;

		const { getByText } = render(SendNftReview, { props: { nft } });

		// "Send: {name} #{id}"
		expect(getByText(`${sendLabel}: ${nft.name} #${nft.id}`)).toBeInTheDocument();

		// Network name
		expect(getByText(nft.collection.network.name)).toBeInTheDocument();
	});
});
