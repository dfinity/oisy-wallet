import NftCard from '$lib/components/nfts/NftCard.svelte';
import * as nftsUtils from '$lib/utils/nfts.utils';
import { mockValidErc1155Nft, mockValidErc721Nft } from '$tests/mocks/nfts.mock';
import { assertNonNullish } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('NftCard', () => {
	const testId = 'nft-card';

	const imageSelector = `div[data-tid="${testId}-image"]`;
	const networkLogoSelector = `div[data-tid="${testId}-network-light-container"]`;
	const balanceSelector = `span[data-tid="${testId}-balance"]`;

	beforeAll(() => {
		vi.spyOn(nftsUtils, 'getAllowMediaForNft').mockReturnValue(true);
	});

	it('should render nft with metadata', () => {
		const { container, getByText } = render(NftCard, {
			props: {
				nft: mockValidErc1155Nft,
				testId,
				type: 'card-link'
			}
		});

		const image: HTMLDivElement | null = container.querySelector(imageSelector);

		expect(image).toBeInTheDocument();

		const networkLogo: HTMLDivElement | null = container.querySelector(networkLogoSelector);

		expect(networkLogo).toBeInTheDocument();

		const balance: HTMLSpanElement | null = container.querySelector(balanceSelector);

		expect(balance).toBeInTheDocument();

		assertNonNullish(mockValidErc1155Nft?.name);

		expect(getByText(mockValidErc1155Nft.name)).toBeInTheDocument();
		expect(getByText(`#${mockValidErc1155Nft.id}`)).toBeInTheDocument();
	});

	it('should render image placeholder if no image is defined', () => {
		const { container, getByText } = render(NftCard, {
			props: {
				nft: { ...mockValidErc721Nft, imageUrl: undefined },
				testId,
				type: 'card-link'
			}
		});

		const image: HTMLDivElement | null = container.querySelector(imageSelector);

		expect(image?.getAttribute('class')?.includes('animate-pulse')).toBeTruthy();

		const networkLogo: HTMLDivElement | null = container.querySelector(networkLogoSelector);

		expect(networkLogo).toBeInTheDocument();

		assertNonNullish(mockValidErc721Nft.name);

		expect(getByText(mockValidErc721Nft.name)).toBeInTheDocument();
		expect(getByText(`#${mockValidErc721Nft.id}`)).toBeInTheDocument();
	});

	it('should render the correct styles for each type', async () => {
		const { container, rerender } = render(NftCard, {
			props: {
				nft: { ...mockValidErc721Nft, imageUrl: undefined },
				testId,
				type: 'default'
			}
		});

		const cardElement = container.querySelector('button');

		assertNonNullish(cardElement);

		expect(cardElement.getAttribute('class')?.includes(' bg-primary')).toBeTruthy();
		expect(cardElement.getAttribute('class')?.includes(' group')).toBeFalsy();
		expect(cardElement.getAttribute('class')?.includes(' hover:bg-primary')).toBeFalsy();

		await rerender({
			nft: { ...mockValidErc721Nft, imageUrl: undefined },
			testId,
			type: 'card-link'
		});

		expect(cardElement.getAttribute('class')?.includes(' bg-primary')).toBeFalsy();
		expect(cardElement.getAttribute('class')?.includes(' group')).toBeTruthy();
		expect(cardElement.getAttribute('class')?.includes(' hover:bg-primary')).toBeTruthy();

		await rerender({
			nft: { ...mockValidErc721Nft, imageUrl: undefined },
			testId,
			type: 'card-selectable'
		});

		expect(cardElement.getAttribute('class')?.includes(' bg-primary')).toBeFalsy();
		expect(cardElement.getAttribute('class')?.includes(' group')).toBeTruthy();
		expect(cardElement.getAttribute('class')?.includes(' hover:bg-primary')).toBeTruthy();
	});
});
