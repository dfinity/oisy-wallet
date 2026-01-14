import * as appEnvironment from '$app/environment';
import { MediaType } from '$lib/enums/media-type';
import { extractMediaTypeAndSize, extractMediaUrls } from '$lib/services/url.services';
import type { MockInstance } from 'vitest';

describe('url.services', () => {
	describe('extractMediaUrls', () => {
		let spyBrowser: MockInstance;

		const mockFetch = vi.fn();

		const mockUrl = 'https://example.com/test';

		beforeEach(() => {
			vi.clearAllMocks();

			mockFetch.mockResolvedValue({
				headers: {
					get: () => null
				}
			});

			global.fetch = mockFetch;

			spyBrowser = vi.spyOn(appEnvironment, 'browser', 'get');

			spyBrowser.mockReturnValue(true);
		});

		it('should return early if it is not in browser', async () => {
			spyBrowser.mockReturnValue(false);

			await expect(extractMediaUrls(mockUrl)).resolves.toStrictEqual([]);

			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('should return an empty array if the content type is nullish', async () => {
			await expect(extractMediaUrls(mockUrl)).resolves.toStrictEqual([]);

			expect(mockFetch).toHaveBeenCalledExactlyOnceWith(mockUrl);
		});

		it('should list correctly all URLs from an SVG document', async () => {
			const mockSvgContent = `<svg xmlns="http://www.w3.org/2000/svg">
			  <image href="https://example.com/image1.png" />
			  <image xlink:href="https://example.com/image2.png" />
			</svg>`;

			global.fetch = mockFetch.mockResolvedValue({
				headers: {
					get: (h: string) => (h === 'Content-Type' ? 'image/svg+xml' : null)
				},
				text: () => mockSvgContent
			});

			await expect(extractMediaUrls(mockUrl)).resolves.toStrictEqual([
				'https://example.com/image1.png',
				'https://example.com/image2.png'
			]);
		});

		it('should list correctly all URLs from an HTML document', async () => {
			const mockHtmlContent = `<html>
			  <body>
				<img src="https://example.com/image1.jpg" />
				<video>
				  <source src="https://example.com/video1.mp4" />
				</video>
				<video src="https://example.com/video2.mp4"></video>
			  </body>
			</html>`;

			global.fetch = mockFetch.mockResolvedValue({
				headers: {
					get: (h: string) => (h === 'Content-Type' ? 'text/html' : null)
				},
				text: () => mockHtmlContent
			});

			await expect(extractMediaUrls(mockUrl)).resolves.toStrictEqual([
				'https://example.com/image1.jpg',
				'https://example.com/video1.mp4',
				'https://example.com/video2.mp4'
			]);
		});

		it('should return an empty array if fetching fails', async () => {
			global.fetch = mockFetch.mockRejectedValue(new Error('network error'));

			await expect(extractMediaUrls(mockUrl)).resolves.toStrictEqual([]);
		});
	});

	describe('extractMediaTypeAndSize', () => {
		const mockUrl = 'https://example.com/test';

		const mockSize = 123_456;

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should return image media type and size for images', async () => {
			global.fetch = vi.fn().mockResolvedValueOnce({
				headers: {
					get: (h: string) =>
						h === 'Content-Type' ? 'image/png' : h === 'Content-Length' ? mockSize.toString() : null
				}
			});

			await expect(extractMediaTypeAndSize(mockUrl)).resolves.toStrictEqual({
				type: MediaType.Img,
				size: mockSize
			});
		});

		it('should return image media type and size for gif', async () => {
			global.fetch = vi.fn().mockResolvedValueOnce({
				headers: {
					get: (h: string) =>
						h === 'Content-Type'
							? '.gif;charset=utf-8'
							: h === 'Content-Length'
								? mockSize.toString()
								: null
				}
			});

			await expect(extractMediaTypeAndSize(mockUrl)).resolves.toStrictEqual({
				type: MediaType.Img,
				size: mockSize
			});
		});

		it('should return video media type and size for video', async () => {
			global.fetch = vi.fn().mockResolvedValueOnce({
				headers: {
					get: (h: string) =>
						h === 'Content-Type' ? 'video/mp4' : h === 'Content-Length' ? mockSize.toString() : null
				}
			});

			await expect(extractMediaTypeAndSize(mockUrl)).resolves.toStrictEqual({
				type: MediaType.Video,
				size: mockSize
			});
		});

		it('should handle unmapped media types gracefully', async () => {
			global.fetch = vi.fn().mockResolvedValueOnce({
				headers: {
					get: (h: string) =>
						h === 'Content-Type' ? 'text/html' : h === 'Content-Length' ? mockSize.toString() : null
				}
			});

			await expect(extractMediaTypeAndSize(mockUrl)).resolves.toStrictEqual({
				type: MediaType.Other,
				size: mockSize
			});
		});

		it('should handle a missing content size', async () => {
			global.fetch = vi.fn().mockResolvedValueOnce({
				headers: {
					get: (h: string) => (h === 'Content-Type' ? 'video/mp4' : null)
				}
			});

			await expect(extractMediaTypeAndSize(mockUrl)).resolves.toStrictEqual({
				type: MediaType.Video,
				size: null
			});
		});

		it('should handle fetching failures gracefully', async () => {
			global.fetch = vi.fn().mockRejectedValueOnce(new Error('network error'));

			await expect(extractMediaTypeAndSize(mockUrl)).resolves.toStrictEqual({
				type: null,
				size: null
			});
		});

		it('should handle non-numeric content sizes gracefully', async () => {
			global.fetch = vi.fn().mockResolvedValueOnce({
				headers: {
					get: (h: string) =>
						h === 'Content-Type' ? 'image/png' : h === 'Content-Length' ? 'not-a-number' : null
				}
			});

			await expect(extractMediaTypeAndSize(mockUrl)).resolves.toStrictEqual({
				type: MediaType.Img,
				size: null
			});
		});
	});
});
