import { findLookalike, toLookalikeKey } from '$lib/utils/lookalike.utils';

describe('lookalike.utils', () => {
	describe('toLookalikeKey', () => {
		it.each([
			{ how: 'a Cyrillic \u{421}', text: 'USD\u{421}' },
			{ how: 'a Cyrillic \u{405}', text: 'U\u{405}DC' },
			{ how: 'a Greek lunate sigma', text: 'USD\u{3F9}' },
			{ how: 'full-width letters', text: '\u{FF35}\u{FF33}\u{FF24}\u{FF23}' },
			{ how: 'a Roman numeral one hundred', text: 'USD\u{216D}' },
			{ how: 'lower case', text: 'usdc' },
			{ how: 'an accent', text: 'USD\u{C7}' },
			{ how: 'a zero-width space', text: 'US\u{200B}DC' },
			{ how: 'a trailing space', text: 'USDC ' }
		])('should give USDC written with $how the key of USDC', ({ text }) => {
			expect(toLookalikeKey(text)).toBe(toLookalikeKey('USDC'));
		});

		it.each(['USDT', 'USD', 'USDCC', 'ckUSDC'])('should keep %s apart from USDC', (text) => {
			expect(toLookalikeKey(text)).not.toBe(toLookalikeKey('USDC'));
		});

		it('should treat a digit and the letter it looks like alike', () => {
			expect(toLookalikeKey('B0B')).toBe(toLookalikeKey('BOB'));
		});
	});

	describe('findLookalike', () => {
		const among = [
			{ symbol: 'ICP', name: 'Internet Computer' },
			{ symbol: 'ckBTC', name: 'ckBTC' },
			{ symbol: 'MOON', name: 'Moon' }
		];

		it('should find a token whose symbol looks like the symbol', () => {
			expect(
				findLookalike({ token: { symbol: 'ck\u{412}\u{422}\u{421}', name: 'Mine' }, among })
			).toBe(among[1]);
		});

		it('should find a token whose name looks like the name', () => {
			expect(findLookalike({ token: { symbol: 'XYZ', name: 'Internet Computer' }, among })).toBe(
				among[0]
			);
		});

		it('should find a token whose symbol looks like the name', () => {
			expect(findLookalike({ token: { symbol: 'XYZ', name: 'ckBTC' }, among })).toBe(among[1]);
		});

		it.each([
			{ label: 'icp', token: { symbol: 'icp', name: 'Mine' }, index: 0 },
			{ label: 'internet computer', token: { symbol: 'XYZ', name: 'internet computer' }, index: 0 },
			{ label: 'moon', token: { symbol: 'moon', name: 'Mine' }, index: 2 },
			{ label: 'MOON in a name', token: { symbol: 'XYZ', name: 'MOON' }, index: 2 }
		])(
			'should find a token whatever the case of a letter with a lookalike: $label',
			({ token, index }) => {
				expect(findLookalike({ token, among })).toBe(among[index]);
			}
		);

		it('should still treat a lowercase l as the capital I it looks like', () => {
			expect(findLookalike({ token: { symbol: 'lCP', name: 'Mine' }, among })).toBe(among[0]);
		});

		it('should keep apart letters that only match in another case', () => {
			expect(
				findLookalike({
					token: { symbol: 'lcp', name: 'Mine' },
					among: [{ symbol: 'icp', name: 'icp' }]
				})
			).toBeUndefined();
		});

		it('should find nothing for a token that looks like none of them', () => {
			expect(findLookalike({ token: { symbol: 'XYZ', name: 'Xyz Token' }, among })).toBeUndefined();
		});

		it('should find nothing without a symbol or name', () => {
			expect(findLookalike({ token: {}, among })).toBeUndefined();
			expect(findLookalike({ token: { symbol: '\u{200B}', name: ' ' }, among })).toBeUndefined();
		});
	});
});
