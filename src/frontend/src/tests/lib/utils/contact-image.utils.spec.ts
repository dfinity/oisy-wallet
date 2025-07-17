import { dataUrlToImage } from '$lib/utils/contact-image.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { vi } from 'vitest';

describe('contact-image.utils', () => {
	beforeEach(() => {
		mockAuthStore();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('dataUrlToImage', () => {
		const sampleDataUrl = `data:image/png;base64,${btoa(String.fromCharCode(10, 20, 30, 40))}`;

		it('should throw error for invalid data URL', () => {
			expect(() => dataUrlToImage('invalid-url')).toThrow('Invalid data URL');
		});

		it('should correctly parse valid data URL', () => {
			const result = dataUrlToImage(sampleDataUrl);

			expect(result.mime_type).toEqual({ 'image/png': null });
			expect(result.data).toEqual(new Uint8Array([10, 20, 30, 40]));
		});
	});
});
