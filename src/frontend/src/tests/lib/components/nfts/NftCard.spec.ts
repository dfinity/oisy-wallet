import NftCard from '$lib/components/nfts/NftCard.svelte';
import { mockValidErc721Nft } from '$tests/mocks/nfts.mock';
import { render } from '@testing-library/svelte';

describe('NftCard', () => {
	const testId = 'nft-card';

	const imageSelector = `img[data-tid="${testId}-image"]`;
	const imagePlaceholderSelector = `div[data-tid="${testId}-placeholder"]`;
	const networkLogoSelector = `div[data-tid="${testId}-network-light-container"]`;

	it('should render nft with metadata', () => {
		const { container, getByText } = render(NftCard, {
			props: {
				nft: mockValidErc721Nft,
				testId
			}
		});

		const image: HTMLImageElement | null = container.querySelector(imageSelector);

		expect(image).toBeInTheDocument();

		const networkLogo: HTMLDivElement | null = container.querySelector(networkLogoSelector);

		expect(networkLogo).toBeInTheDocument();

		expect(getByText(mockValidErc721Nft.contract.name)).toBeInTheDocument();
		expect(getByText(`#${mockValidErc721Nft.id}`)).toBeInTheDocument();
	});

	it('should render image placeholder if no image is defined', () => {
		const { container, getByText } = render(NftCard, {
			props: {
				nft: { ...mockValidErc721Nft, imageUrl: null },
				testId
			}
		});

		const imagePlaceholder: HTMLDivElement | null =
			container.querySelector(imagePlaceholderSelector);

		expect(imagePlaceholder).toBeInTheDocument();

		const networkLogo: HTMLDivElement | null = container.querySelector(networkLogoSelector);

		expect(networkLogo).toBeInTheDocument();

		expect(getByText(mockValidErc721Nft.contract.name)).toBeInTheDocument();
		expect(getByText(`#${mockValidErc721Nft.id}`)).toBeInTheDocument();
	});
});
