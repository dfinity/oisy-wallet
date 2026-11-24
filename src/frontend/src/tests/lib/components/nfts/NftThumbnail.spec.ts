import { loadNftThumbnail } from '$lib/services/nft-thumbnail.services';
import NftThumbnailTestHost from '$tests/lib/components/nfts/NftThumbnailTestHost.svelte';
import { IntersectionObserverActive } from '$tests/mocks/infinite-scroll.mock';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';

describe('NftThumbnail', () => {
	const urlTestId = 'nft-thumbnail-url';

	const mockImageUrl = 'https://example.com/media?tokenid=1';
	const mockThumbnail = 'data:image/png;base64,dGh1bWJuYWls';

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render the small copy of an SVG media', async () => {
		vi.mocked(loadNftThumbnail).mockResolvedValueOnce(mockThumbnail);

		const { findByTestId } = render(NftThumbnailTestHost, { props: { imageUrl: mockImageUrl } });

		await expect(findByTestId(urlTestId)).resolves.toHaveTextContent(mockThumbnail);

		expect(loadNftThumbnail).toHaveBeenCalledExactlyOnceWith(mockImageUrl);
	});

	it('should render the original URL for any other media', async () => {
		vi.mocked(loadNftThumbnail).mockResolvedValueOnce(undefined);

		const { findByTestId } = render(NftThumbnailTestHost, { props: { imageUrl: mockImageUrl } });

		await expect(findByTestId(urlTestId)).resolves.toHaveTextContent(mockImageUrl);
	});

	it('should render the original URL if loading the small copy fails', async () => {
		vi.mocked(loadNftThumbnail).mockRejectedValueOnce(new Error('unexpected'));

		const { findByTestId } = render(NftThumbnailTestHost, { props: { imageUrl: mockImageUrl } });

		await expect(findByTestId(urlTestId)).resolves.toHaveTextContent(mockImageUrl);
	});

	it('should render nothing while the media type is not known', async () => {
		vi.mocked(loadNftThumbnail).mockReturnValueOnce(new Promise(() => {}));

		const { queryByTestId } = render(NftThumbnailTestHost, { props: { imageUrl: mockImageUrl } });

		await tick();

		expect(queryByTestId(urlTestId)).not.toBeInTheDocument();
	});

	it('should render right away without an image URL', () => {
		const { getByTestId } = render(NftThumbnailTestHost, { props: { imageUrl: undefined } });

		expect(getByTestId(urlTestId)).toHaveTextContent('none');

		expect(loadNftThumbnail).not.toHaveBeenCalled();
	});

	it('should load the small copy again when the image URL changes', async () => {
		const otherImageUrl = 'https://example.com/media?tokenid=2';
		const otherThumbnail = 'data:image/png;base64,b3RoZXI=';

		vi.mocked(loadNftThumbnail)
			.mockResolvedValueOnce(mockThumbnail)
			.mockResolvedValueOnce(otherThumbnail);

		const { findByTestId, rerender } = render(NftThumbnailTestHost, {
			props: { imageUrl: mockImageUrl }
		});

		await expect(findByTestId(urlTestId)).resolves.toHaveTextContent(mockThumbnail);

		await rerender({ imageUrl: otherImageUrl });

		await expect(findByTestId(urlTestId)).resolves.toHaveTextContent(otherThumbnail);

		expect(loadNftThumbnail).toHaveBeenNthCalledWith(2, otherImageUrl);
	});

	describe('with an IntersectionObserver', () => {
		// Never reports the card as near the screen.
		class IntersectionObserverPassive {
			observe = vi.fn();
			unobserve = vi.fn();
			disconnect = vi.fn();
			takeRecords = () => [];
		}

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it('should not load anything while the card is far from the screen', async () => {
			vi.stubGlobal('IntersectionObserver', IntersectionObserverPassive);

			const { queryByTestId } = render(NftThumbnailTestHost, {
				props: { imageUrl: mockImageUrl }
			});

			await tick();

			expect(loadNftThumbnail).not.toHaveBeenCalled();
			expect(queryByTestId(urlTestId)).not.toBeInTheDocument();
		});

		it('should load the small copy once the card is near the screen', async () => {
			vi.stubGlobal('IntersectionObserver', IntersectionObserverActive);

			vi.mocked(loadNftThumbnail).mockResolvedValueOnce(mockThumbnail);

			const { findByTestId } = render(NftThumbnailTestHost, { props: { imageUrl: mockImageUrl } });

			await expect(findByTestId(urlTestId)).resolves.toHaveTextContent(mockThumbnail);

			expect(loadNftThumbnail).toHaveBeenCalledExactlyOnceWith(mockImageUrl);
		});

		it('should render right away without an image URL, even far from the screen', () => {
			vi.stubGlobal('IntersectionObserver', IntersectionObserverPassive);

			const { getByTestId } = render(NftThumbnailTestHost, { props: { imageUrl: undefined } });

			expect(getByTestId(urlTestId)).toHaveTextContent('none');
		});
	});
});
