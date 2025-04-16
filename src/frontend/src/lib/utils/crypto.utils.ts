import { uint8ArrayToHexString } from '@dfinity/utils';

const textEncoder = new TextEncoder();

/**
 * Hashes the given input string using the SHA-256 algorithm.
 */
export async function sha256(input: string): Promise<ArrayBuffer> {
	return await crypto.subtle.digest('SHA-256', textEncoder.encode(input));
}

/**
 * Combines the hashing and hex conversion of a string into a single function.
 */
export async function hashToHex(input: string): Promise<string> {
	const hashBuffer = await sha256(input);

	// Convert the ArrayBuffer to Uint8Array
	const uint8Array = new Uint8Array(hashBuffer);

	return uint8ArrayToHexString(uint8Array);
}
