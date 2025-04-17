import { uint8ArrayToHexString } from '@dfinity/utils';

/**
 * Hashes the given input string using the SHA-256 algorithm.
 * @param {string} input - The input string to be hashed.
 * @returns {Promise<ArrayBuffer>} - A promise that resolves to the resulting SHA-256 hash as an ArrayBuffer.
 */
export const sha256 = async (input: string): Promise<ArrayBuffer> => {
	const textEncoder = new TextEncoder();
	return await crypto.subtle.digest('SHA-256', textEncoder.encode(input));
};

/**
 * Combines the hashing and hex conversion of a string into a single function.
 * @param {string} input - The input string to be hashed and converted to a hexadecimal string.
 * @returns {Promise<string>} - A promise that resolves to the resulting hash as a hexadecimal string.
 */
export const hashToHex = async (input: string): Promise<string> => {
	// TODO remove sha256 and replace oisy-wallet-signer/src/utils/crypto.utils.ts as soon as a dedicated sha256 function becomes available
	const hashBuffer = await sha256(input);

	// Convert the ArrayBuffer to Uint8Array
	const uint8Array = new Uint8Array(hashBuffer);

	return uint8ArrayToHexString(uint8Array);
};
