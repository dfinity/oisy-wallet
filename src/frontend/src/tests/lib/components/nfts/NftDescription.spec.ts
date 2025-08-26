import NftDescription from '$lib/components/nfts/NftDescription.svelte';
import { TOKEN_SKELETON_TEXT } from '$lib/constants/test-ids.constants';
import { mockValidErc1155Nft } from '$tests/mocks/nfts.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('NftDescription', () => {
	it('renders the description if available', () => {
		const { container } = render(NftDescription, {
			props: {
				nft: { ...mockValidErc1155Nft, description: 'Test description' }
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
		const { container } = render(NftDescription, {
			props: {
				nft: mockValidErc1155Nft
			}
		});

		const title = container.querySelector('h5');
		const desc = container.querySelector('p');

		expect(title).not.toBeInTheDocument();

		expect(desc).not.toBeInTheDocument();
	});

	it('should render some skeletons if nft is not loaded yet', () => {
		const { getAllByTestId } = render(NftDescription, {
			props: {
				nft: undefined
			}
		});

		const skeletons = getAllByTestId(TOKEN_SKELETON_TEXT);

		expect(skeletons).toHaveLength(3);
	});
});
