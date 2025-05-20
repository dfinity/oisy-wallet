import { parseBoolEnvVar } from '$lib/utils/env.utils';

describe('env.utils', () => {
	describe('parseBoolEnvVar', () => {
		describe('when the check is `true` (default)', () => {
			['true', 'TRUE', 'True', 'TrUe'].forEach((value) => {
				it(`should return true for "${value}"`, () => {
					expect(parseBoolEnvVar(value)).toBeTruthy();
				});
			});

			['false', 'FALSE', 'False', 'FaLsE'].forEach((value) => {
				it(`should return false for "${value}"`, () => {
					expect(parseBoolEnvVar(value)).toBeFalsy();
				});
			});

			['1', '0'].forEach((value) => {
				it(`should return false for "${value}"`, () => {
					expect(parseBoolEnvVar(value)).toBeFalsy();
				});
			});
		});

		describe('when the check is `false`', () => {
			['true', 'TRUE', 'True', 'TrUe'].forEach((value) => {
				it(`should return false for "${value}"`, () => {
					expect(parseBoolEnvVar(value, false)).toBeFalsy();
				});
			});

			['false', 'FALSE', 'False', 'FaLsE'].forEach((value) => {
				it(`should return true for "${value}"`, () => {
					expect(parseBoolEnvVar(value, false)).toBeTruthy();
				});
			});

			['1', '0'].forEach((value) => {
				it(`should return false for "${value}"`, () => {
					expect(parseBoolEnvVar(value, false)).toBeFalsy();
				});
			});
		});

		['not_a_json', 'yes', 'no', 'a'].forEach((value) => {
			it(`should throw for malformed JSON string "${value}"`, () => {
				expect(() => parseBoolEnvVar(value)).toThrow(
					expect.objectContaining({
						message: expect.stringContaining(`"${value}" is not valid JSON`)
					})
				);
			});
		});

		it('should throw for empty strings', () => {
			expect(() => parseBoolEnvVar('')).toThrow('Unexpected end of JSON input');
		});

		it('should return false for nullish values', () => {
			expect(parseBoolEnvVar(null)).toBeFalsy();

			expect(parseBoolEnvVar(undefined)).toBeFalsy();
		});
	});

	describe('parseEnabledMainnetBoolEnvVar', () => {
		['true', 'TRUE', 'True', 'TrUe'].forEach((value) => {
			it(`should return false for "${value}"`, () => {
				expect(parseBoolEnvVar(value, false)).toBeFalsy();
			});
		});

		['false', 'FALSE', 'False', 'FaLsE'].forEach((value) => {
			it(`should return true for "${value}"`, () => {
				expect(parseBoolEnvVar(value, false)).toBeTruthy();
			});
		});

		['1', '0'].forEach((value) => {
			it(`should return false for "${value}"`, () => {
				expect(parseBoolEnvVar(value, false)).toBeFalsy();
			});
		});

		['not_a_json', 'yes', 'no', 'a'].forEach((value) => {
			it(`should throw for malformed JSON string "${value}"`, () => {
				expect(() => parseBoolEnvVar(value)).toThrow(
					expect.objectContaining({
						message: expect.stringContaining(`"${value}" is not valid JSON`)
					})
				);
			});
		});

		it('should throw for empty strings', () => {
			expect(() => parseBoolEnvVar('')).toThrow('Unexpected end of JSON input');
		});

		it('should return false for nullish values', () => {
			expect(parseBoolEnvVar(null)).toBeFalsy();

			expect(parseBoolEnvVar(undefined)).toBeFalsy();
		});
	});
});
