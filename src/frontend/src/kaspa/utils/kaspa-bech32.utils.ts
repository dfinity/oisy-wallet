/**
 * Kaspa-specific bech32 encoding utilities.
 *
 * Kaspa uses a bech32 variant similar to Bitcoin Cash's CashAddr format,
 * with a different checksum polynomial than standard bech32/bech32m.
 */

// Kaspa bech32 character set (same as standard bech32)
const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

// Reverse lookup for decoding
const CHARSET_REV: Record<string, number> = {};
for (let i = 0; i < CHARSET.length; i++) {
	CHARSET_REV[CHARSET[i]] = i;
}

/**
 * Kaspa/CashAddr polymod function.
 * Uses different generator values than standard bech32.
 */
const polymod = (values: number[]): bigint => {
	const GENERATORS = [
		0x98f2bc8e61n,
		0x79b76d99e2n,
		0xf33e5fb3c4n,
		0xae2eabe2a8n,
		0x1e4f43e470n
	];

	let chk = 1n;
	for (const value of values) {
		const top = chk >> 35n;
		chk = ((chk & 0x07ffffffffn) << 5n) ^ BigInt(value);
		for (let i = 0; i < 5; i++) {
			if ((top >> BigInt(i)) & 1n) {
				chk ^= GENERATORS[i];
			}
		}
	}
	return chk ^ 1n;
};

/**
 * Expand the HRP for checksum calculation.
 */
const hrpExpand = (hrp: string): number[] => {
	const result: number[] = [];
	for (const char of hrp) {
		result.push(char.charCodeAt(0) & 0x1f);
	}
	result.push(0);
	return result;
};

/**
 * Convert 8-bit bytes to 5-bit words.
 */
export const toWords = (bytes: Uint8Array): number[] => {
	const words: number[] = [];
	let bits = 0;
	let value = 0;

	for (const byte of bytes) {
		value = (value << 8) | byte;
		bits += 8;
		while (bits >= 5) {
			bits -= 5;
			words.push((value >> bits) & 0x1f);
		}
	}

	if (bits > 0) {
		words.push((value << (5 - bits)) & 0x1f);
	}

	return words;
};

/**
 * Calculate the checksum for a Kaspa address.
 */
const createChecksum = (hrp: string, data: number[]): number[] => {
	const values = [...hrpExpand(hrp), ...data, 0, 0, 0, 0, 0, 0, 0, 0];
	const mod = polymod(values);
	const checksum: number[] = [];
	for (let i = 0; i < 8; i++) {
		checksum.push(Number((mod >> BigInt(5 * (7 - i))) & 0x1fn));
	}
	return checksum;
};

/**
 * Encode data as a Kaspa bech32 address.
 *
 * @param hrp - Human-readable part ('kaspa' or 'kaspatest')
 * @param data - 5-bit words to encode
 * @returns Encoded address string with ':' separator
 */
export const encodeKaspaAddress = (hrp: string, data: number[]): string => {
	const checksum = createChecksum(hrp, data);
	const combined = [...data, ...checksum];

	let result = hrp + ':';
	for (const word of combined) {
		result += CHARSET[word];
	}

	return result;
};

/**
 * Verify a Kaspa address checksum.
 */
export const verifyKaspaChecksum = (hrp: string, data: number[]): boolean => {
	return polymod([...hrpExpand(hrp), ...data]) === 0n;
};

/**
 * Decode a Kaspa address.
 *
 * @param address - Full Kaspa address string
 * @returns Object with hrp and decoded data, or null if invalid
 */
export const decodeKaspaAddress = (
	address: string
): { hrp: string; data: number[] } | null => {
	const colonIndex = address.indexOf(':');
	if (colonIndex === -1) {
		return null;
	}

	const hrp = address.slice(0, colonIndex);
	const dataStr = address.slice(colonIndex + 1);

	const data: number[] = [];
	for (const char of dataStr) {
		const value = CHARSET_REV[char];
		if (value === undefined) {
			return null;
		}
		data.push(value);
	}

	if (!verifyKaspaChecksum(hrp, data)) {
		return null;
	}

	// Remove checksum (8 characters)
	return { hrp, data: data.slice(0, -8) };
};
