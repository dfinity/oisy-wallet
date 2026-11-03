import { visibleTokenSymbol } from '$lib/utils/token-symbol.utils';

describe('token-symbol.utils', () => {
	describe('visibleTokenSymbol', () => {
		it('should keep an ordinary symbol as it is', () => {
			expect(visibleTokenSymbol('PAXG')).toBe('PAXG');
		});

		it('should return nothing for no symbol', () => {
			expect(visibleTokenSymbol(undefined)).toBeUndefined();
		});

		// A zero-width space hides between letters, a bidirectional override turns what follows it
		// around, and a control character has no business in a ticker at all.
		it('should drop the characters that show nothing or reorder the rest', () => {
			expect(visibleTokenSymbol('US\u200BDC\u202E\u0007')).toBe('USDC');
		});

		it('should collapse and trim whitespace', () => {
			expect(visibleTokenSymbol(' US \n\t DC ')).toBe('US DC');
		});

		it('should keep a symbol of twelve characters whole', () => {
			expect(visibleTokenSymbol('ABCDEFGHIJKL')).toBe('ABCDEFGHIJKL');
		});

		it('should cut a longer symbol to twelve characters, the ellipsis included', () => {
			expect(visibleTokenSymbol('ABCDEFGHIJKLMNOPQRSTUVWXYZ')).toBe('ABCDEFGHIJK…');
		});

		it('should not end a cut symbol on a space', () => {
			expect(visibleTokenSymbol('ABCDEFGHIJ KLMNOP')).toBe('ABCDEFGHIJ…');
		});

		it('should count marks stacked onto a letter', () => {
			expect(visibleTokenSymbol(`A${'\u0301'.repeat(30)}`)).toBe(`A${'\u0301'.repeat(10)}…`);
		});

		it.each([
			{ kind: 'nothing but invisible characters', symbol: '\u200B\u202E \u0007' },
			{ kind: 'a variation selector', symbol: '\uFE0F' },
			{ kind: 'a Hangul filler', symbol: '\u3164' },
			{ kind: 'an empty string', symbol: '' }
		])('should return nothing for $kind', ({ symbol }) => {
			expect(visibleTokenSymbol(symbol)).toBeUndefined();
		});
	});
});
