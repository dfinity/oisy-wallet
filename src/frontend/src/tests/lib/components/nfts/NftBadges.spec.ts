import NftBadges from '$lib/components/nfts/NftBadges.svelte';
import { NFT_HIDDEN_BADGE, NFT_SPAM_BADGE } from '$lib/constants/test-ids.constants';
import { CustomTokenSection } from '$lib/enums/custom-token-section';
import { AZUKI_ELEMENTAL_BEANS_TOKEN } from '$tests/mocks/erc721-tokens.mock';
import { render } from '@testing-library/svelte';

describe('NftBadges.spec', () => {
	it('should render the hidden badge if the NFT is hidden', () => {
		const { getByTestId } = render(NftBadges, {
			props: {
				token: { ...AZUKI_ELEMENTAL_BEANS_TOKEN, section: CustomTokenSection.HIDDEN }
			}
		});

		expect(getByTestId(NFT_HIDDEN_BADGE)).toBeInTheDocument();
	});

	it('should render the spam badge if the NFT is spam', () => {
		const { getByTestId } = render(NftBadges, {
			props: {
				token: { ...AZUKI_ELEMENTAL_BEANS_TOKEN, section: CustomTokenSection.SPAM }
			}
		});

		expect(getByTestId(NFT_SPAM_BADGE)).toBeInTheDocument();
	});
});
