/**
 * base64url (RFC 4648 §5, no padding) — safe in a URL path or fragment, unlike
 * standard base64.
 *
 * Extracted from `personal-note-share.crypto`, which noted the repo had no
 * shared helper and kept these local "with the only code that needs them".
 * Tips need the same three primitives, and a third copy of a padding-stripping
 * base64 converter is the kind of duplication that eventually diverges in one
 * place only.
 */

// Typed `Uint8Array<ArrayBuffer>` rather than the default `Uint8Array<ArrayBufferLike>`
// (which also admits `SharedArrayBuffer`) so the result satisfies WebCrypto's
// `BufferSource` parameters under TypeScript 5.7+.
export const randomBytes = (length: number): Uint8Array<ArrayBuffer> =>
	crypto.getRandomValues(new Uint8Array(length));

export const toBase64Url = (bytes: Uint8Array): string => {
	let binary = '';
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
};

export const fromBase64Url = (value: string): Uint8Array<ArrayBuffer> => {
	const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
	const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
	const binary = atob(padded);
	return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

/** A fresh, opaque random value of `length` bytes, base64url-encoded. */
export const randomBase64Url = (length: number): string => toBase64Url(randomBytes(length));
