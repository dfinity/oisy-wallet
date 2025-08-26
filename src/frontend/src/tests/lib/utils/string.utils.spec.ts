import { Languages } from '$lib/enums/languages';
import { capitalizeFirstLetter } from '$lib/utils/string.utils';

describe('string.utils', () => {
	describe('capitalizeFirstLetter', () => {
		it('should capitalise the first letter', () => {
			expect(
				capitalizeFirstLetter({
					val: 'hello world',
					language: Languages.ENGLISH
				})
			).toBe('Hello world');

			expect(
				capitalizeFirstLetter({
					val: 'hello world',
					language: Languages.CHINESE_SIMPLIFIED
				})
			).toBe('Hello world');
		});

		it('should apply Turkish casing (i → İ) for tr-TR', () => {
			expect(
				capitalizeFirstLetter({
					val: 'istanbul is big',
					language: 'tr-TR' as unknown as Languages
				})
			).toBe('İstanbul is big');
		});

		it('should leave a leading emoji unchanged', () => {
			expect(
				capitalizeFirstLetter({
					val: '👩‍💻 coding time',
					language: Languages.ENGLISH
				})
			).toBe('👩‍💻 coding time');
		});

		it('should handle German ß expanding to multiple code points when uppercased', () => {
			const result = capitalizeFirstLetter({
				val: 'ßildschirm',
				language: Languages.GERMAN
			});

			// Depending on engine/Unicode version, this will be "SSildschirm" (common in JS)
			expect(result === 'SSildschirm' || result === 'ẞildschirm').toBeTruthy();
		});

		it('should handle empty strings', () => {
			expect(
				capitalizeFirstLetter({
					val: '',
					language: Languages.ENGLISH
				})
			).toEqual('');
		});

		it('should keep leading whitespace as-is (does not skip it)', () => {
			expect(
				capitalizeFirstLetter({
					val: '  hello',
					language: Languages.ENGLISH
				})
			).toBe('  hello');
		});

		it('should keep leading punctuation as-is when uppercasing has no effect', () => {
			expect(
				capitalizeFirstLetter({
					val: '«quoted» text',
					language: Languages.ENGLISH
				})
			).toBe('«quoted» text');
		});

		it('should be idempotent when the first letter is already uppercase', () => {
			expect(
				capitalizeFirstLetter({
					val: 'Hello already',
					language: Languages.ENGLISH
				})
			).toBe('Hello already');
		});

		it('should handle single-character strings', () => {
			expect(
				capitalizeFirstLetter({
					val: 'a',
					language: Languages.ENGLISH
				})
			).toBe('A');
		});

		it('should handle strings with only whitespace', () => {
			expect(
				capitalizeFirstLetter({
					val: '     ',
					language: Languages.ENGLISH
				})
			).toBe('     ');
		});

		it('should handle strings with combining characters', () => {
			expect(
				capitalizeFirstLetter({
					val: 'école', // 'e' + combining acute accent
					language: Languages.FRENCH
				})
			).toBe('École');
		});

		it('should handle strings with surrogate pairs', () => {
			expect(
				capitalizeFirstLetter({
					val: '𠜎 is a rare character', // U+2000E
					language: Languages.ENGLISH
				})
			).toBe('𠜎 is a rare character');
		});

		it('should handle strings with no alphabetic characters', () => {
			expect(
				capitalizeFirstLetter({
					val: '12345!@#$%',
					language: Languages.ENGLISH
				})
			).toBe('12345!@#$%');
		});

		it('should handle non-Latin scripts', () => {
			expect(
				capitalizeFirstLetter({
					val: 'привет мир',
					language: 'ru-RU' as unknown as Languages
				})
			).toBe('Привет мир');

			expect(
				capitalizeFirstLetter({
					val: 'αθήνα είναι όμορφη',
					language: 'el-GR' as unknown as Languages
				})
			).toBe('Αθήνα είναι όμορφη');
		});

		it('should handle RTL scripts', () => {
			// Hebrew "ש" is already uppercase (no case distinction), so unchanged
			expect(
				capitalizeFirstLetter({
					val: 'שלום עולם',
					language: 'he-IL' as unknown as Languages
				})
			).toBe('שלום עולם');
		});

		it('should handle strings with punctuation at the start', () => {
			expect(
				capitalizeFirstLetter({
					val: '"quoted text"',
					language: Languages.ENGLISH
				})
			).toBe('"quoted text"');
		});

		it('should handle strings with numbers at the start', () => {
			expect(
				capitalizeFirstLetter({
					val: '123 apples',
					language: Languages.ENGLISH
				})
			).toBe('123 apples');
		});
	});
});
