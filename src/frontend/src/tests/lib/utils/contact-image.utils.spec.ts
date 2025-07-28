import type { ContactImage, ImageMimeType } from '$declarations/backend/backend.did';
import { dataUrlToImage, imageToDataUrl } from '$lib/utils/contact-image.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';

describe('contact-image.utils', () => {
	const MOCK_IMAGE: ContactImage = {
		data: new Uint8Array([1, 2, 3]),
		mime_type: { 'image/png': null } as ImageMimeType
	};

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

			expect(result).toBeDefined();

			expect(result?.mime_type).toEqual({ 'image/png': null });
			expect(result?.data).toEqual(new Uint8Array([10, 20, 30, 40]));
		});
	});

	describe('imageToDataUrl', () => {
		it('should convert ContactImage to data URL', () => {
			const result = imageToDataUrl(MOCK_IMAGE);

			expect(result).toBeDefined();
			expect(result).toMatch(/^data:image\/png;base64,/);
		});
	});
});
