/* istanbul ignore file */
/* v8 ignore start */

import { blobDecode, blobEncode } from './encoding.js';

/**
 * A chain code is a 32 byte array
 */
export class ChainCode {
	static readonly LENGTH = 32;

	constructor(public readonly bytes: Uint8Array) {
		if (bytes.length !== ChainCode.LENGTH) {
			throw new Error(
				`Invalid ChainCode length: expected ${ChainCode.LENGTH} bytes, got ${bytes.length}`
			);
		}
	}

	/**
	 * Creates a new ChainCode from a 64 character hex string.
	 * @param hex_str The 64 character hex string.
	 * @returns A new ChainCode.
	 */
	static fromHex(hex_str: string): ChainCode {
		if (hex_str.length !== ChainCode.LENGTH * 2) {
			throw new Error(
				`Invalid ChainCode length: expected ${ChainCode.LENGTH * 2} characters, got ${hex_str.length}`
			);
		}
		const bytes = Buffer.from(hex_str, 'hex');
		return new ChainCode(new Uint8Array(bytes));
	}

	static fromArray(array: number[]): ChainCode {
		return new ChainCode(new Uint8Array(array));
	}

	/**
	 * @returns The chain code as a 64 character hex string.
	 */
	toHex(): string {
		return Buffer.from(this.bytes).toString('hex');
	}

	/**
	 * Creates a new ChainCode from a Candid blob.
	 * @param blob The blob to create the chain code from.
	 * @returns A new ChainCode.
	 */
	static fromBlob(blob: string): ChainCode {
		return new ChainCode(blobDecode(blob));
	}

	/**
	 * @returns The chain code as a Candid blob.
	 */
	toBlob(): string {
		return blobEncode(this.bytes);
	}

	/**
	 * Creates a new ChainCode from a string.
	 * @param str The chain code as a hex string or Candid blob.
	 * @returns A new ChainCode.
	 */
	static fromString(str: string): ChainCode {
		if (str.length === ChainCode.LENGTH * 2 && str.match(/^[0-9A-Fa-f]+$/)) {
			return ChainCode.fromHex(str);
		}
		return ChainCode.fromBlob(str);
	}

	toJSON(): string {
		return this.toHex();
	}
}

/* v8 ignore stop */
