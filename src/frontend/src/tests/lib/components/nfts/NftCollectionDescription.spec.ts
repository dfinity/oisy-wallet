import * as navUtils from '$app/navigation';
import NftCollectionDescription from '$lib/components/nfts/NftCollectionDescription.svelte';
import {
	NFT_COLLECTION_ACTION_HIDE,
	NFT_COLLECTION_ACTION_SPAM
} from '$lib/constants/test-ids.constants';
import { i18n } from '$lib/stores/i18n.store';
import { nftsUrl } from '$lib/utils/nav.utils';
import * as nftsUtils from '$lib/utils/nfts.utils';
import { mockValidErc1155Token } from '$tests/mocks/erc1155-tokens.mock';
import { mockValidErc1155Nft } from '$tests/mocks/nfts.mock';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('NftCollectionDescription', () => {
	it('renders the description if available', () => {
		const { container } = render(NftCollectionDescription, {
			props: {
				collection: { ...mockValidErc1155Nft.collection, description: 'Test description' }
			}
		});

		const title = container.querySelector('h5');
		const desc = container.querySelector('p');

		assertNonNullish(title);

		expect(title).toBeInTheDocument();
		expect(title.innerHTML).toEqual(mockValidErc1155Nft.collection.name);

		assertNonNullish(desc);

		expect(desc).toBeInTheDocument();
		expect(desc.innerHTML).toEqual('Test description');
	});

	it('should not render anything if no collection data is available', () => {
		const { container } = render(NftCollectionDescription, {
			props: {
				collection: undefined
			}
		});

		const title = container.querySelector('h5');
		const desc = container.querySelector('p');

		expect(title).not.toBeInTheDocument();

		expect(desc).not.toBeInTheDocument();
	});

	it('should render action buttons', () => {
		vi.spyOn(nftsUtils, 'findNonFungibleToken').mockReturnValue(mockValidErc1155Token);

		const { getByTestId } = render(NftCollectionDescription, {
			props: {
				collection: { ...mockValidErc1155Nft.collection, description: 'Test description' }
			}
		});

		const spamBtn = getByTestId(NFT_COLLECTION_ACTION_SPAM);

		expect(spamBtn).toBeInTheDocument();

		const hideBtn = getByTestId(NFT_COLLECTION_ACTION_HIDE);

		expect(hideBtn).toBeInTheDocument();
	});

	it('should render a working link to the collection page', async () => {
		const gotoSpy = vi.spyOn(navUtils, 'goto');

		const collection = { ...mockValidErc1155Nft.collection, description: 'Test description' };

		const { getByText } = render(NftCollectionDescription, {
			props: {
				collection
			}
		});

		const link = getByText(get(i18n).nfts.text.go_to_collection);

		await fireEvent.click(link);

		expect(gotoSpy).toHaveBeenCalledWith(nftsUrl({ collection }));
	});
});
