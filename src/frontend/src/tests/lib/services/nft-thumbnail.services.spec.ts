import { NFT_THUMBNAIL_MAX_SIZE, NFT_THUMBNAIL_TIMEOUT_MILLIS } from '$lib/constants/app.constants';
import { loadNftThumbnail, resetNftThumbnails } from '$lib/services/nft-thumbnail.services';
import { isSvgMedia } from '$lib/services/url.services';

vi.unmock('$lib/services/nft-thumbnail.services');

vi.mock('$lib/services/url.services', () => ({
	isSvgMedia: vi.fn()
}));

describe('nft-thumbnail.services', () => {
	const mockUrl = 'https://example.com/media?tokenid=1';
	const mockThumbnail = 'data:image/png;base64,dGh1bWJuYWls';

	const images: MockImage[] = [];

	const mockDecode = vi.fn();
	const mockDrawImage = vi.fn();

	class MockImage {
		crossOrigin: string | null = null;
		src = '';
		naturalWidth = 150;
		naturalHeight = 150;
		srcAtDecode: string | undefined;

		constructor() {
			images.push(this);
		}

		decode(): Promise<void> {
			this.srcAtDecode = this.src;

			return mockDecode(this);
		}
	}

	const deferred = () => {
		let resolve: () => void = () => {};
		let reject: (err: Error) => void = () => {};

		const promise = new Promise<void>((res, rej) => {
			resolve = res;
			reject = rej;
		});

		return { promise, resolve, reject };
	};

	beforeEach(() => {
		vi.clearAllMocks();

		resetNftThumbnails();

		images.length = 0;

		vi.stubGlobal('Image', MockImage);

		mockDecode.mockResolvedValue(undefined);

		vi.mocked(isSvgMedia).mockResolvedValue(true);

		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
			drawImage: mockDrawImage
		} as unknown as CanvasRenderingContext2D);

		vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(mockThumbnail);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.useRealTimers();
	});

	it('should return undefined for media that is not an SVG', async () => {
		vi.mocked(isSvgMedia).mockResolvedValueOnce(false);

		await expect(loadNftThumbnail(mockUrl)).resolves.toBeUndefined();

		expect(isSvgMedia).toHaveBeenCalledExactlyOnceWith(mockUrl);
		expect(images).toHaveLength(0);
	});

	it('should draw an SVG into a small canvas and return it as a PNG data URL', async () => {
		await expect(loadNftThumbnail(mockUrl)).resolves.toBe(mockThumbnail);

		expect(images).toHaveLength(1);

		const [image] = images;

		expect(image.crossOrigin).toBe('anonymous');
		expect(image.srcAtDecode).toBe(mockUrl);

		expect(mockDrawImage).toHaveBeenCalledExactlyOnceWith(
			image,
			0,
			0,
			NFT_THUMBNAIL_MAX_SIZE,
			NFT_THUMBNAIL_MAX_SIZE
		);
		expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledExactlyOnceWith('image/png');
	});

	it('should release the image once drawn', async () => {
		await loadNftThumbnail(mockUrl);

		expect(images[0].src).toBe('');
	});

	it.each([
		{ naturalWidth: 300, naturalHeight: 150, width: NFT_THUMBNAIL_MAX_SIZE, height: 256 },
		{ naturalWidth: 150, naturalHeight: 300, width: 256, height: NFT_THUMBNAIL_MAX_SIZE },
		{
			naturalWidth: 0,
			naturalHeight: 0,
			width: NFT_THUMBNAIL_MAX_SIZE,
			height: NFT_THUMBNAIL_MAX_SIZE
		}
	])(
		'should draw a $naturalWidth x $naturalHeight SVG at $width x $height',
		async ({ naturalWidth, naturalHeight, width, height }) => {
			mockDecode.mockImplementationOnce((image: MockImage) => {
				image.naturalWidth = naturalWidth;
				image.naturalHeight = naturalHeight;

				return Promise.resolve();
			});

			await loadNftThumbnail(mockUrl);

			expect(mockDrawImage).toHaveBeenCalledExactlyOnceWith(images[0], 0, 0, width, height);
		}
	);

	it('should cache the thumbnail per URL', async () => {
		const first = loadNftThumbnail(mockUrl);
		const second = loadNftThumbnail(mockUrl);

		expect(second).toBe(first);

		await expect(second).resolves.toBe(mockThumbnail);

		expect(isSvgMedia).toHaveBeenCalledOnce();
		expect(images).toHaveLength(1);
	});

	it('should load again after the cache is reset', async () => {
		await loadNftThumbnail(mockUrl);

		resetNftThumbnails();

		await loadNftThumbnail(mockUrl);

		expect(isSvgMedia).toHaveBeenCalledTimes(2);
	});

	it('should return undefined if the SVG cannot be decoded', async () => {
		mockDecode.mockRejectedValueOnce(new Error('EncodingError'));

		await expect(loadNftThumbnail(mockUrl)).resolves.toBeUndefined();

		expect(images[0].src).toBe('');
		expect(mockDrawImage).not.toHaveBeenCalled();
	});

	it('should return undefined if the canvas has no 2D context', async () => {
		vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValueOnce(null);

		await expect(loadNftThumbnail(mockUrl)).resolves.toBeUndefined();
	});

	it('should return undefined if the canvas cannot be exported', async () => {
		vi.mocked(HTMLCanvasElement.prototype.toDataURL).mockImplementationOnce(() => {
			throw new Error('SecurityError');
		});

		await expect(loadNftThumbnail(mockUrl)).resolves.toBeUndefined();
	});

	it('should return undefined if checking the media type throws', async () => {
		vi.mocked(isSvgMedia).mockRejectedValueOnce(new Error('unexpected'));

		await expect(loadNftThumbnail(mockUrl)).resolves.toBeUndefined();
	});

	it('should draw one SVG at a time', async () => {
		const firstDecode = deferred();

		mockDecode.mockReturnValueOnce(firstDecode.promise);

		const first = loadNftThumbnail(`${mockUrl}-first`);
		const second = loadNftThumbnail(`${mockUrl}-second`);

		await vi.waitFor(() => expect(mockDecode).toHaveBeenCalledOnce());

		// Give the second load every chance to start drawing too early.
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(mockDecode).toHaveBeenCalledOnce();

		firstDecode.resolve();

		await expect(first).resolves.toBe(mockThumbnail);
		await expect(second).resolves.toBe(mockThumbnail);

		expect(mockDecode).toHaveBeenCalledTimes(2);
	});

	it('should keep drawing after a draw fails', async () => {
		mockDecode.mockRejectedValueOnce(new Error('EncodingError'));

		const first = loadNftThumbnail(`${mockUrl}-first`);
		const second = loadNftThumbnail(`${mockUrl}-second`);

		await expect(first).resolves.toBeUndefined();
		await expect(second).resolves.toBe(mockThumbnail);
	});

	it('should give up on an SVG that never loads and draw the next one', async () => {
		vi.useFakeTimers();

		mockDecode.mockReturnValueOnce(new Promise(() => {}));

		const first = loadNftThumbnail(`${mockUrl}-first`);
		const second = loadNftThumbnail(`${mockUrl}-second`);

		await vi.advanceTimersByTimeAsync(NFT_THUMBNAIL_TIMEOUT_MILLIS);

		await expect(first).resolves.toBeUndefined();
		await expect(second).resolves.toBe(mockThumbnail);

		expect(images[0].src).toBe('');
	});

	it('should give up on a media type check that never answers', async () => {
		vi.useFakeTimers();

		vi.mocked(isSvgMedia).mockReturnValueOnce(new Promise(() => {}));

		const thumbnail = loadNftThumbnail(mockUrl);

		await vi.advanceTimersByTimeAsync(NFT_THUMBNAIL_TIMEOUT_MILLIS);

		await expect(thumbnail).resolves.toBeUndefined();

		expect(images).toHaveLength(0);
	});
});
