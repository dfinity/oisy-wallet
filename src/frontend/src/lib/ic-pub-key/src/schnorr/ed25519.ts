/* eslint-disable */
/* istanbul ignore file */
/* v8 ignore start */

import { ExtendedPoint } from '@noble/ed25519';
import { hkdf as nobleHkdf } from '@noble/hashes/hkdf.js';
import { sha512 } from '@noble/hashes/sha2';
import { ChainCode } from '../chain_code.js';
import { bigintFromBigEndianBytes, blobDecode, blobEncode } from '../encoding.js';
export { ChainCode };

/**
 * The order of ed25519.
 */
const ORDER = 2n ** 252n + 27742317777372353535851937790883648493n;

/**
 * One part of a derivation path.
 */
export type PathComponent = Uint8Array;

export class PublicKey {
	/**
	 * The length of a public key in bytes.  As hex it is twice this.
	 */
	static readonly LENGTH = 32;

	constructor(public readonly key: ExtendedPoint) {
		if (key.is0()) {
			throw new Error('Invalid public key');
		}
	}

	/**
	 * Parses a public key from a string in any supported format.
	 */
	static fromString(public_key_string: string): PublicKey {
		// At present only hex is supported, so this is easy:
		return PublicKey.fromHex(public_key_string);
	}

	/**
	 * Creates a new PublicKey from a hex string.
	 * @param hex The hex string to create the public key from.
	 * @throws If the hex string has the wrong length for a public key.
	 * @throws If the public key is the point at infinity.
	 * @returns A new PublicKey.
	 */
	static fromHex(hex: string): PublicKey {
		return new PublicKey(ExtendedPoint.fromHex(hex, true));
	}

	/**
	 * Returns the public key as a hex string.
	 * @returns A 64 character hex string.
	 */
	toHex(): string {
		return this.key.toHex();
	}

	/**
	 * Returns the preferred JSON encoding of the public key.
	 * @returns A 64 character hex string.
	 */
	toJSON(): string {
		return this.toHex();
	}
}

/**
 * A public key with its chain code.
 */
export class PublicKeyWithChainCode {
	/**
	 * @param public_key The public key.
	 * @param chain_code A hash of the derivation path.
	 */
	constructor(
		public readonly public_key: PublicKey,
		public readonly chain_code: ChainCode
	) {}

	/**
	 * Creates a new PublicKeyWithChainCode from two hex strings.
	 * @param public_key_hex The public key in hex format.
	 * @param chain_code_hex The chain code in hex format.
	 * @returns A new PublicKeyWithChainCode.
	 */
	static fromHex(public_key_hex: string, chain_code_hex: string): PublicKeyWithChainCode {
		const public_key = PublicKey.fromHex(public_key_hex);
		const chain_key = ChainCode.fromHex(chain_code_hex);
		return new PublicKeyWithChainCode(public_key, chain_key);
	}

	/**
	 * Creates a new PublicKeyWithChainCode from two strings.
	 * @param public_key_string The public key in any format supported by PublicKey.fromString.
	 * @param chain_code_string The chain code in any format supported by ChainCode.fromString.
	 * @returns A new PublicKeyWithChainCode.
	 */
	static fromString(public_key_string: string, chain_code_string: string): PublicKeyWithChainCode {
		const public_key = PublicKey.fromString(public_key_string);
		const chain_code = ChainCode.fromString(chain_code_string);
		return new PublicKeyWithChainCode(public_key, chain_code);
	}

	/**
	 * Applies the given derivation path to obtain a new public key and chain code.
	 *
	 * Corresponds to rust: [`ic_ed25519::PublicKey::derive_public_key_with_chain_code()`](https://github.com/dfinity/ic/blob/e915efecc8af90993ccfc499721ebe826aadba60/packages/ic-ed25519/src/lib.rs#L774C1-L793C6)
	 */
	deriveSubkeyWithChainCode(derivationPath: DerivationPath): PublicKeyWithChainCode {
		const [pt, _sum, chainCode] = derivationPath.deriveOffset(this.public_key.key, this.chain_code);
		return new PublicKeyWithChainCode(new PublicKey(pt), chainCode);
	}
}

export class DerivationPath {
	constructor(public readonly path: PathComponent[]) {}

	/**
	 * Creates a new DerivationPath from / separated candid blobs.
	 * @param blob The / separated blobs to create the derivation path from.
	 * @returns A new DerivationPath.
	 */
	static fromBlob(blob: string | undefined | null): DerivationPath {
		if (blob === undefined || blob === null) {
			return new DerivationPath([]);
		}
		return new DerivationPath(blob.split('/').map((p) => blobDecode(p)));
	}

	/**
	 * @returns A string representation of the derivation path: Candid blob encoded with a '/' between each path component.  Or `null` for a derivation path with no components.
	 */
	toBlob(): string | null {
		if (this.path.length === 0) {
			return null;
		}
		return this.path.map((p) => blobEncode(p)).join('/');
	}

	/**
	 * Returns the preferred JSON encoding of the public key.
	 * @returns A 64 character hex string.
	 */
	toJSON(): string | null {
		return this.toBlob();
	}

	/**
	 * A typescript translation of [ic_ed25519::DerivationPath::derive_offset](https://github.com/dfinity/ic/blob/e915efecc8af90993ccfc499721ebe826aadba60/packages/ic-ed25519/src/lib.rs#L849).
	 * @param pt The public key to derive the offset from.
	 * @param chainCode The chain code to derive the offset from.
	 * @returns A tuple containing the derived public key, the offset, and the chain code.
	 */
	deriveOffset(pt: ExtendedPoint, chainCode: ChainCode): [ExtendedPoint, bigint, ChainCode] {
		return this.path.reduce(deriveOneOffset, [pt, 0n, chainCode]);
	}
}

/**
 * One iteration of the main loop of `DerivationPath.derive_offset`.
 *
 * This should also correspond to the main loop of [ic_ed25519::DerivationPath::derive_offset](https://github.com/dfinity/ic/blob/e915efecc8af90993ccfc499721ebe826aadba60/packages/ic-ed25519/src/lib.rs#L849).
 * @param pt The public key to derive the offset from.
 * @param sum The sum of the offsets of the previous iterations.
 * @param chainCode The chain code to derive the offset from.
 * @param idx The next component or index of the derivation path.
 * @returns A tuple containing the derived public key, the offset, and the chain code.
 */
export function deriveOneOffset(
	[pt, sum, chainCode]: [ExtendedPoint, bigint, ChainCode],
	idx: PathComponent
): [ExtendedPoint, bigint, ChainCode] {
	// Concatenate idx and pt:
	const ptBytes = pt.toRawBytes();
	const ikm = new Uint8Array(ptBytes.length + idx.length);
	ikm.set(ptBytes, 0);
	ikm.set(idx, ptBytes.length);

	// Hash
	const okm = nobleHkdf(sha512, ikm, chainCode.bytes, 'Ed25519', 96);

	// Interpret the first 64 bytes of the okm as an ed25519 scalar.
	const offset = offsetFromOkm(okm);

	// Get the outputs
	pt = pt.add(ExtendedPoint.BASE.multiply(offset));
	sum = (sum + offset) % ORDER;
	chainCode = new ChainCode(okm.subarray(64, 96));

	return [pt, sum, chainCode];
}

/**
 * Interpret the first 64 bytes of the okm as an ed25519 scalar.
 * @param okm The okm to interpret.
 * @returns The interpreted number.
 */
export function offsetFromOkm(okm: Uint8Array): bigint {
	const offsetBytes = new Uint8Array(okm.subarray(0, 64));
	const offset = bigintFromBigEndianBytes(offsetBytes);
	const reduced = offset % ORDER;
	return reduced;
}

/**
 * Derives a public key, using only string arguments and responses.
 *
 * @param pubkey
 * @param chaincode
 * @param derivationpath
 * @returns
 */
export function schnorr_ed25519_derive(
	pubkey: string,
	chaincode: string,
	derivationpath: string | null
): string {
	const pubkey_with_chain_code = PublicKeyWithChainCode.fromString(pubkey, chaincode);
	const parsed_derivationpath = DerivationPath.fromBlob(derivationpath);
	const derived_pubkey = pubkey_with_chain_code.deriveSubkeyWithChainCode(parsed_derivationpath);

	return derived_pubkey.public_key.toHex();
}

/* v8 ignore stop */
