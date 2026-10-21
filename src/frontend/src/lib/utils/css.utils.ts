// Escapes as CSSOM's "serialize a string" (https://drafts.csswg.org/cssom/#serialize-a-string), except
// that NULL becomes `\0 `, which CSS reads as U+FFFD - the character that algorithm writes.
const escapeCssStringChar = (char: string): string => {
	const codePoint = char.codePointAt(0) ?? 0;

	if (codePoint <= 0x1f || codePoint === 0x7f) {
		return `\\${codePoint.toString(16)} `;
	}

	if (char === '"' || char === '\\') {
		return `\\${char}`;
	}

	return char;
};

/**
 * Wraps a URL in a CSS `url()` with the URL as a quoted, escaped string.
 *
 * Inline styles are parsed as text - including the first render of a Svelte `style:` directive,
 * which goes through `cssText` - so an unquoted URL from third-party data could close `url()` and
 * append declarations of its own. Inside the string, `)` and `;` are plain characters.
 */
export const toCssUrl = (url: string): string =>
	`url("${Array.from(url, escapeCssStringChar).join('')}")`;
