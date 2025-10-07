import NftCollectionCard from '$lib/components/nfts/NftCollectionDescription.svelte';
import {
	NFT_COLLECTION_ACTION_HIDE,
	NFT_COLLECTION_ACTION_SPAM
} from '$lib/constants/test-ids.constants';
import { mockValidErc1155Nft } from '$tests/mocks/nfts.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('NftCollectionDescription', () => {
	it('renders the description if available', () => {
		const { container } = render(NftCollectionCard, {
			props: {
				collection: { ...mockValidErc1155Nft.collection, description: 'Test description' }
			}
		});

		const title = container.querySelector('h5');
		const desc = container.querySelector('p');

		assertNonNullish(title);

		expect(title).toBeInTheDocument();
		expect(title.innerHTML).toEqual(mockValidErc1155Nft.name);

		assertNonNullish(desc);

		expect(desc).toBeInTheDocument();
		expect(desc.innerHTML).toEqual('Test description');
	});

	it('should not render anything if no description is available', () => {
		const { container } = render(NftCollectionCard, {
			props: {
				collection: mockValidErc1155Nft.collection
			}
		});

		const title = container.querySelector('h5');
		const desc = container.querySelector('p');

		expect(title).not.toBeInTheDocument();

		expect(desc).not.toBeInTheDocument();
	});

	it('should render action buttons', () => {
		const { findByTestId } = render(NftCollectionCard, {
			props: {
				collection: { ...mockValidErc1155Nft.collection, description: 'Test description' }
			}
		});

		const spamBtn = findByTestId(NFT_COLLECTION_ACTION_SPAM);

		expect(spamBtn).toBeInTheDocument();

		const hideBtn = findByTestId(NFT_COLLECTION_ACTION_HIDE);

		expect(hideBtn).toBeInTheDocument();
	});
});
