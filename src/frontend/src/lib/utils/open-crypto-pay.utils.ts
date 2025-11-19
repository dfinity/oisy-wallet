import { decode, fromWords } from 'bech32';

/**
 * Decodes LNURL according to LNURL-01 standard
 *
 * LNURL is a bech32-encoded URL with "lnurl" prefix.
 * Decoding process:
 * 1. Decode bech32 (converts from base32 to 5-bit words)
 * 2. Convert 5-bit words to 8-bit bytes
 * 3. Decode bytes to UTF-8 string (URL)
 *
 * @param lnurl - LNURL string (e.g., "LNURL1DP68GURN8GHJ7...")
 * @returns Decoded URL string
 * @throws {Error} If LNURL is invalid or decoding failed
 *
 */
export const decodeLNURL = (lnurl: string): string => {
	const { words } = decode(lnurl, 2000);
	const bytes = fromWords(words);

	const url = new TextDecoder().decode(new Uint8Array(bytes));

	return url;
};
