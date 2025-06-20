/* eslint-disable */
/* istanbul ignore file */
/* v8 ignore start */

/**
 * Encodes an array of bytes as a Candid blob string.
 * @param path
 * @returns
 */
export function blobEncode(bytes: Uint8Array): string {
	return [...bytes].map((p) => blobEncodeU8(p)).join('');
}
/**
 * Decodes a Candid blob string as an array of bytes.
 * @param s
 * @returns
 */
export function blobDecode(s: string): Uint8Array {
	let ans = [];
	let skip = 0;
	let byte = 0;
	for (let char of s) {
		if (skip == 2) {
			byte = parseInt(char, 16);
			skip--;
			continue;
		}
		if (skip == 1) {
			byte = byte * 16 + parseInt(char, 16);
			ans.push(byte);
			skip--;
			continue;
		}
		if (char === '\\') {
			skip = 2;
			byte = 0;
			continue;
		}
		ans.push(char.charCodeAt(0));
	}
	// Handle incomplete escape sequences
	if (skip > 0) {
		throw new Error('Incomplete escape sequence at the end of the input string.');
	}
	return new Uint8Array(ans);
}

/**
 * @returns True if the character is an ASCII alphanumeric character.
 */
function isAsciiAlphanumeric(code: number): boolean {
	return (
		(code >= 48 && code <= 57) || // 0-9
		(code >= 65 && code <= 90) || // A-Z
		(code >= 97 && code <= 122) // a-z
	);
}
/**
 * Encodes a single byte as a Candid blob string.
 * @param u8
 * @returns
 */
function blobEncodeU8(u8: number): string {
	if (isAsciiAlphanumeric(u8)) {
		return String.fromCharCode(u8);
	}
	// Backslash and two hex chars:
	return `\\${u8.toString(16).padStart(2, '0')}`;
}

/* v8 ignore stop */
