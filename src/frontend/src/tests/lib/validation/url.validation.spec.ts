import { UrlSchema } from '$lib/validation/url.validation';

describe('UrlSchema', () => {
	it('should accept valid https URLs', () => {
		const validUrl = 'https://example.com';
		expect(() => UrlSchema.parse(validUrl)).not.toThrow();
	});

	it('should accept valid https URLs with port', () => {
		const validUrl = 'https://example.com:666';
		expect(() => UrlSchema.parse(validUrl)).not.toThrow();
	});

	it('should accept valid https URLs with sub domain', () => {
		const validUrl = 'https://staging.oisy.com';
		expect(() => UrlSchema.parse(validUrl)).not.toThrow();
	});

	it('should accept valid https URLs with route', () => {
		const validUrl = 'https://staging.oisy.com/sign';
		expect(() => UrlSchema.parse(validUrl)).not.toThrow();
	});

	it('should reject localhost with http', () => {
		const invalidUrl = 'http://localhost:3000';
		expect(() => UrlSchema.parse(invalidUrl)).toThrow('Invalid URL.');
	});

	it('should reject 127.0.0.1 with http', () => {
		const invalidUrl = 'http://127.0.0.1:3000';
		expect(() => UrlSchema.parse(invalidUrl)).toThrow('Invalid URL.');
	});

	it('should accept valid wss URLs', () => {
		const validUrl = 'wss://example.com';
		expect(() => UrlSchema.parse(validUrl)).not.toThrow();
	});

	it('should accept valid wss URLs with port', () => {
		const validUrl = 'wss://example.com:666';
		expect(() => UrlSchema.parse(validUrl)).not.toThrow();
	});

	it('should accept valid wss URLs with sub domain', () => {
		const validUrl = 'wss://staging.oisy.com';
		expect(() => UrlSchema.parse(validUrl)).not.toThrow();
	});

	it('should accept valid wss URLs with route', () => {
		const validUrl = 'wss://staging.oisy.com/sign';
		expect(() => UrlSchema.parse(validUrl)).not.toThrow();
	});

	it('should reject localhost with an invalid protocol', () => {
		const invalidUrl = 'ftp://localhost:3000';
		expect(() => UrlSchema.parse(invalidUrl)).toThrow('Invalid URL.');
	});

	it('should reject non-localhost with an invalid protocol', () => {
		const invalidUrl = 'ftp://example.com:3000';
		expect(() => UrlSchema.parse(invalidUrl)).toThrow('Invalid URL.');
	});

	it('should reject non-localhost URLs without https', () => {
		const invalidUrl = 'http://example.com';
		expect(() => UrlSchema.parse(invalidUrl)).toThrow('Invalid URL.');
	});

	it('should reject an invalid URL', () => {
		const invalidUrl = 'invalid-url';
		expect(() => UrlSchema.parse(invalidUrl)).toThrow('Invalid URL.');
	});

	it('should reject an empty string', () => {
		const invalidUrl = '';
		expect(() => UrlSchema.parse(invalidUrl)).toThrow('Invalid URL.');
	});
});
