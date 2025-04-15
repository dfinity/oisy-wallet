import { parseBoolEnvVar } from '$lib/utils/env.utils';

describe('env.utils', () => {
	describe('parseBoolEnvVar', () => {
		describe('when the check is `true` (default)', () => {
			['true', 'TRUE', 'True', 'TrUe'].forEach((value) => {
				it(`should return true for "${value}"`, () => {
					expect(parseBoolEnvVar(value)).toBe(true);
				});
			});

			['false', 'FALSE', 'False', 'FaLsE'].forEach((value) => {
				it(`should return false for "${value}"`, () => {
					expect(parseBoolEnvVar(value)).toBe(false);
				});
			});

			['1', '0'].forEach((value) => {
				it(`should return false for "${value}"`, () => {
					expect(parseBoolEnvVar(value)).toBe(false);
				});
			});
		});

		describe('when the check is `false`', () => {
			['true', 'TRUE', 'True', 'TrUe'].forEach((value) => {
				it(`should return false for "${value}"`, () => {
					expect(parseBoolEnvVar(value, false)).toBe(false);
				});
			});

			['false', 'FALSE', 'False', 'FaLsE'].forEach((value) => {
				it(`should return true for "${value}"`, () => {
					expect(parseBoolEnvVar(value, false)).toBe(true);
				});
			});

			['1', '0'].forEach((value) => {
				it(`should return false for "${value}"`, () => {
					expect(parseBoolEnvVar(value, false)).toBe(false);
				});
			});
		});

		['not_a_json', 'yes', 'no', 'a'].forEach((value) => {
			it(`should throw for malformed JSON string "${value}"`, () => {
				expect(() => parseBoolEnvVar(value)).toThrowError(
					expect.objectContaining({
						message: expect.stringContaining(`"${value}" is not valid JSON`)
					})
				);
			});
		});

		it('should throw for empty strings', () => {
			expect(() => parseBoolEnvVar('')).toThrowError('Unexpected end of JSON input');
		});

		it('should return false for nullish values', () => {
			expect(parseBoolEnvVar(null)).toBe(false);

			expect(parseBoolEnvVar(undefined)).toBe(false);
		});
	});

	describe('parseEnabledMainnetBoolEnvVar', () => {
		['true', 'TRUE', 'True', 'TrUe'].forEach((value) => {
			it(`should return false for "${value}"`, () => {
				expect(parseBoolEnvVar(value, false)).toBe(false);
			});
		});

		['false', 'FALSE', 'False', 'FaLsE'].forEach((value) => {
			it(`should return true for "${value}"`, () => {
				expect(parseBoolEnvVar(value, false)).toBe(true);
			});
		});

		['1', '0'].forEach((value) => {
			it(`should return false for "${value}"`, () => {
				expect(parseBoolEnvVar(value, false)).toBe(false);
			});
		});

		['not_a_json', 'yes', 'no', 'a'].forEach((value) => {
			it(`should throw for malformed JSON string "${value}"`, () => {
				expect(() => parseBoolEnvVar(value)).toThrowError(
					expect.objectContaining({
						message: expect.stringContaining(`"${value}" is not valid JSON`)
					})
				);
			});
		});

		it('should throw for empty strings', () => {
			expect(() => parseBoolEnvVar('')).toThrowError('Unexpected end of JSON input');
		});

		it('should return false for nullish values', () => {
			expect(parseBoolEnvVar(null)).toBe(false);

			expect(parseBoolEnvVar(undefined)).toBe(false);
		});
	});
});
