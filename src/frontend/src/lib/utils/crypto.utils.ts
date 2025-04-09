const textEncoder = new TextEncoder();

/**
 * Hashes the given input string using the SHA-256 algorithm.
 */
export async function sha256(input: string): Promise<ArrayBuffer> {
	return await crypto.subtle.digest('SHA-256', textEncoder.encode(input));
}

/**
 * Converts an ArrayBuffer to its hexadecimal string representation.
 */
export function bufferToHex(buffer: ArrayBuffer): string {
	return Array.from(new Uint8Array(buffer))
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');
}

/**
 * Combines the hashing and hex conversion of a string into a single function.
 */
export async function hashToHex(input: string): Promise<string> {
	const hashBuffer = await sha256(input);
	return bufferToHex(hashBuffer);
}
