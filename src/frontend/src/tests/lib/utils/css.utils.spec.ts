import { toCssUrl } from '$lib/utils/css.utils';

describe('css.utils', () => {
	describe('toCssUrl', () => {
		it('wraps https, ipfs and data URLs in a quoted url()', () => {
			expect(toCssUrl('https://example.com/pic.png')).toBe('url("https://example.com/pic.png")');
			expect(toCssUrl('ipfs://bafybeigdyrzt/1.png')).toBe('url("ipfs://bafybeigdyrzt/1.png")');
			expect(toCssUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(
				'url("data:image/png;base64,iVBORw0KGgo=")'
			);
		});

		it('keeps parentheses and semicolons inside the string', () => {
			const url =
				'https://cdn.example/a.png);position:fixed;background-image:url(https://other.example/x.png';

			expect(toCssUrl(url)).toBe(`url("${url}")`);
		});

		it('escapes double quotes and backslashes', () => {
			expect(toCssUrl('https://example.com/a"b.png')).toBe('url("https://example.com/a\\"b.png")');
			expect(toCssUrl('https://example.com/a\\b.png')).toBe(
				'url("https://example.com/a\\\\b.png")'
			);
			expect(toCssUrl('https://example.com/a\\");position:fixed;x:("')).toBe(
				'url("https://example.com/a\\\\\\");position:fixed;x:(\\"")'
			);
		});

		it('escapes control characters as hex code points', () => {
			expect(toCssUrl('a\nb')).toBe('url("a\\a b")');
			expect(toCssUrl('a\rb')).toBe('url("a\\d b")');
			expect(toCssUrl('a\fb')).toBe('url("a\\c b")');
			expect(toCssUrl('a\tb')).toBe('url("a\\9 b")');
			expect(toCssUrl('a\u007fb')).toBe('url("a\\7f b")');
			expect(toCssUrl('a\u0000b')).toBe('url("a\\0 b")');
		});

		it('keeps single quotes and non-ASCII characters', () => {
			expect(toCssUrl("https://example.com/l'été.png")).toBe(
				'url("https://example.com/l\'été.png")'
			);
		});
	});
});
