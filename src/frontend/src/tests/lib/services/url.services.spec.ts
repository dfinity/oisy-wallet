import * as appEnvironment from '$app/environment';
import { extractMediaUrls } from '$lib/services/url.services';
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
});
