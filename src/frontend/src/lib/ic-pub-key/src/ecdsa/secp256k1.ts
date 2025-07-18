/* eslint-disable */
/* istanbul ignore file */
/* v8 ignore start */

import { ProjectivePoint, type AffinePoint } from '@noble/secp256k1';
// import createHmac from 'create-hmac';
import { hmac } from '@noble/hashes/hmac';
import { sha512 } from '@noble/hashes/sha2';
import { blobDecode, blobEncode } from '../encoding.js';

/**
 * The response type for the ICP management canister's `ecdsa_public_key` method.
 */
export type EcdsaPublicKeyResponse = PublicKeyWithChainCode;

/**
 * A public key with its chain code.
 */
export class PublicKeyWithChainCode {
	/**
	 * @param public_key The public key.
	 * @param chain_code A hash of the derivation path.
	 */
	constructor(
		public readonly public_key: Sec1EncodedPublicKey,
		public readonly chain_code: ChainCode
	) {}

	/**
	 * Creates a new PublicKeyWithChainCode from two hex strings.
	 * @param public_key The public key as a 66 character hex string.
	 * @param chain_code The chain code as a 64 character hex string.
	 * @returns A new PublicKeyWithChainCode.
	 */
	static fromHex({
		public_key,
		chain_code
	}: {
		public_key: string;
		chain_code: string;
	}): PublicKeyWithChainCode {
		return new PublicKeyWithChainCode(
			Sec1EncodedPublicKey.fromHex(public_key),
			ChainCode.fromHex(chain_code)
		);
	}

	/**
	 * @returns The public key and chain code as hex strings.
	 */
	toHex(): { public_key: string; chain_code: string } {
		return { public_key: this.public_key.toHex(), chain_code: this.chain_code.toHex() };
	}

	/**
	 * @returns The public key and chain code as Candid blobs.
	 */
	toBlob(): { public_key: string; chain_code: string } {
		return { public_key: this.public_key.toBlob(), chain_code: this.chain_code.toBlob() };
	}

	/**
	 * Creates a new PublicKeyWithChainCode from two Candid blobs.
	 * @param public_key The public key as a Candid blob.
	 * @param chain_code The chain code as a Candid blob.
	 * @returns A new PublicKeyWithChainCode.
	 */
	static fromBlob({
		public_key,
		chain_code
	}: {
		public_key: string;
		chain_code: string;
	}): PublicKeyWithChainCode {
		return new PublicKeyWithChainCode(
			Sec1EncodedPublicKey.fromBlob(public_key),
			ChainCode.fromBlob(chain_code)
		);
	}

	/**
	 * Creates a new PublicKeyWithChainCode from two strings.
	 * @param public_key The public key in any supported format.
	 * @param chain_code The chain code in any supported format.
	 * @returns A new PublicKeyWithChainCode.
	 */
	static fromString({
		public_key,
		chain_code
	}: {
		public_key: string;
		chain_code: string;
	}): PublicKeyWithChainCode {
		return new PublicKeyWithChainCode(
			Sec1EncodedPublicKey.fromString(public_key),
			ChainCode.fromString(chain_code)
		);
	}

	/**
	 * Applies the given derivation path to obtain a new public key and chain code.
	 */
	async deriveSubkeyWithChainCode(
		derivation_path: DerivationPath
	): Promise<PublicKeyWithChainCode> {
		return await this.public_key.deriveSubkeyWithChainCode(derivation_path, this.chain_code);
	}
}

/**
 * A public key, represented as a 33 byte array using sec1 encoding.
 */
export class Sec1EncodedPublicKey {
	static readonly LENGTH = 33;

	/**
	 * @param bytes The 33 sec1 bytes of the public key.
	 */
	constructor(public readonly bytes: Uint8Array) {
		if (bytes.length !== Sec1EncodedPublicKey.LENGTH) {
			throw new Error(
				`Invalid PublicKey length: expected ${Sec1EncodedPublicKey.LENGTH} bytes, got ${bytes.length}`
			);
		}
	}

	toAffinePoint(): AffinePoint {
		return ProjectivePoint.fromHex(this.bytes).toAffine();
	}

	static fromProjectivePoint(point: ProjectivePoint): Sec1EncodedPublicKey {
		return new Sec1EncodedPublicKey(point.toRawBytes(true));
	}

	/**
	 * A typescript translation of [ic_secp256k1::PublicKey::derive_subkey_with_chain_code](https://github.com/dfinity/ic/blob/bb6e758c739768ef6713f9f3be2df47884544900/packages/ic-secp256k1/src/lib.rs#L678)
	 * @param derivation_path The derivation path to derive the subkey from.
	 * @returns A tuple containing the derived subkey and the chain code.
	 */
	async deriveSubkeyWithChainCode(
		derivation_path: DerivationPath,
		chain_code: ChainCode
	): Promise<PublicKeyWithChainCode> {
		let public_key = this.toAffinePoint();
		let [affine_pt, _offset, new_chain_code] = await derivation_path.derive_offset(
			public_key,
			chain_code
		);
		let pt = ProjectivePoint.fromAffine(affine_pt);
		return new PublicKeyWithChainCode(Sec1EncodedPublicKey.fromProjectivePoint(pt), new_chain_code);
	}

	toBuffer(): Buffer {
		return Buffer.from(this.bytes);
	}

	/**
	 * Creates a new Sec1EncodedPublicKey from a 66 character hex string.
	 * @param hex The 66 character hex string.
	 * @returns A new Sec1EncodedPublicKey.
	 */
	static fromHex(hex: string): Sec1EncodedPublicKey {
		if (hex.length !== Sec1EncodedPublicKey.LENGTH * 2) {
			throw new Error(
				`Invalid PublicKey length: expected ${Sec1EncodedPublicKey.LENGTH * 2} characters, got ${hex.length}`
			);
		}
		const bytes = Buffer.from(hex, 'hex');
		return new Sec1EncodedPublicKey(new Uint8Array(bytes));
	}

	/**
	 * @returns The public key as a 66 character hex string.
	 */
	toHex(): string {
		return Buffer.from(this.bytes).toString('hex');
	}

	/**
	 * Creates a new Sec1EncodedPublicKey from a Candid blob.
	 * @param blob The blob to create the public key from.
	 * @returns A new Sec1EncodedPublicKey.
	 */
	static fromBlob(blob: string): Sec1EncodedPublicKey {
		return new Sec1EncodedPublicKey(blobDecode(blob));
	}

	/**
	 * @returns The public key as a Candid blob.
	 */
	toBlob(): string {
		return blobEncode(this.bytes);
	}

	/**
	 * Creates a new Sec1EncodedPublicKey from a string.
	 * @param str The string to create the public key from.
	 * @returns A new Sec1EncodedPublicKey.
	 */
	static fromString(str: string): Sec1EncodedPublicKey {
		if (str.length === Sec1EncodedPublicKey.LENGTH * 2 && str.match(/^[0-9A-Fa-f]+$/)) {
			return Sec1EncodedPublicKey.fromHex(str);
		}
		return Sec1EncodedPublicKey.fromBlob(str);
	}
}

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

/**
 * One part of a derivation path.
 */
export type PathComponent = Uint8Array;

export class DerivationPath {
	/**
	 * The k256 group order (and scalar modulus).
	 */
	static readonly ORDER = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;

	constructor(public readonly path: PathComponent[]) {}

	/**
	 * Creates a new DerivationPath from / separated candid blobs.
	 * @param blob The / separated blobs to create the derivation path from.
	 * @returns A new DerivationPath.
	 */
	static fromBlob(blob: string | undefined): DerivationPath {
		if (blob === undefined || blob === null) {
			return new DerivationPath([]);
		}
		return new DerivationPath(blob.split('/').map((p) => blobDecode(p)));
	}

	/**
	 * @returns A string representation of the derivation path: Candid blob encoded with a '/' between each path component.
	 */
	toBlob(): string | null {
		if (this.path.length === 0) {
			return null;
		}
		return this.path.map((p) => blobEncode(p)).join('/');
	}

	/**
	 * A typescript translation of [ic_secp256k1::DerivationPath::derive_offset](https://github.com/dfinity/ic/blob/bb6e758c739768ef6713f9f3be2df47884544900/packages/ic-secp256k1/src/lib.rs#L168)
	 * @param pt The public key to derive the offset from.
	 * @param chain_code The chain code to derive the offset from.
	 * @returns A tuple containing the derived public key, the offset, and the chain code.
	 *
	 * Properties:
	 * - The public key is not ProjectivePoint.ZERO.
	 * - The offset is strictly less than DerivationPath.ORDER.
	 */
	async derive_offset(
		pt: AffinePoint,
		chain_code: ChainCode
	): Promise<[AffinePoint, bigint, ChainCode]> {
		return await this.path.reduce(
			async (accP, idx) => {
				const [pt, offset, chain_code] = await accP;
				const [next_chain_code, next_offset, next_pt] = await DerivationPath.ckd_pub(
					idx,
					pt,
					chain_code
				);

				let new_offset = offset + next_offset;
				while (new_offset >= DerivationPath.ORDER) {
					new_offset -= DerivationPath.ORDER;
				}

				return [next_pt, new_offset, next_chain_code] as [AffinePoint, bigint, ChainCode];
			},
			Promise.resolve<[AffinePoint, bigint, ChainCode]>([pt, 0n, chain_code])
		);
	}

	/**
	 * A typescript translation of [ic_secp256k1::DerivationPath::ckd_pub](https://github.com/dfinity/ic/blob/bb6e758c739768ef6713f9f3be2df47884544900/packages/ic-secp256k1/src/lib.rs#L138)
	 * @param idx A part of the derivation path.
	 * @param pt The public key to derive the offset from.
	 * @param chain_code The chain code to derive the offset from.
	 * @returns A tuple containing the derived chain code, the offset, and the derived public key.
	 *
	 * Properties:
	 * - The offset is strictly less than DerivationPath.ORDER.
	 * - The public key is not ProjectivePoint.ZERO.
	 */
	static async ckd_pub(
		idx: PathComponent,
		pt: AffinePoint,
		chain_code: ChainCode
	): Promise<[ChainCode, bigint, AffinePoint]> {
		let ckd_input = ProjectivePoint.fromAffine(pt).toRawBytes(true);

		while (true) {
			let [next_chain_code, next_offset] = await DerivationPath.ckd(idx, ckd_input, chain_code);

			let base_mul = ProjectivePoint.BASE.multiply(next_offset);
			let next_pt = ProjectivePoint.fromAffine(pt).add(base_mul);

			if (!next_pt.equals(ProjectivePoint.ZERO)) {
				return [next_chain_code, next_offset, next_pt.toAffine()];
			}

			// Otherwise set up the next input as defined by SLIP-0010
			ckd_input[0] = 0x01;
			ckd_input.set(next_chain_code.bytes, 1);
		}
	}

	/**
	 * A typescript translation of [ic_secp256k1::DerivationPath::ckd](https://github.com/dfinity/ic/blob/bb6e758c739768ef6713f9f3be2df47884544900/packages/ic-secp256k1/src/lib.rs#L111)
	 * @param idx A part of the derivation path.
	 * @param ckd_input The input to derive the offset from.
	 * @param chain_code The chain code to derive the offset from.
	 * @returns A tuple containing the derived chain code and the offset.
	 *
	 * Properties:
	 * - The offset is strictly less than DerivationPath.ORDER.
	 */
	static async ckd(
		idx: PathComponent,
		ckd_input: Uint8Array,
		chain_code: ChainCode
	): Promise<[ChainCode, bigint]> {
		// let hmac = createHmac('sha512', Buffer.from(chain_code.bytes));
		// hmac.update(ckd_input);
		// hmac.update(idx);
		// let hmac_output = hmac.digest();

		const joined = new Uint8Array(ckd_input.length + idx.length);
		joined.set(ckd_input);
		joined.set(idx, ckd_input.length);
		let hmac_output = hmac(sha512, Buffer.from(chain_code.bytes), joined);

		// const hmac_output = await browserHmacSha512(Buffer.from(chain_code.bytes), [ckd_input, idx]);

		if (hmac_output.length !== 64) {
			throw new Error('Invalid HMAC output length');
		}

		function toHex(bytes: Uint8Array): string {
			return Array.from(bytes)
				.map((b) => b.toString(16).padStart(2, '0'))
				.join('');
		}

		let fb = hmac_output.subarray(0, 32);
		let fb_hex = toHex(fb);
		let next_chain_key = hmac_output.subarray(32, 64);
		// Treat the bytes as an integer.
		//
		// Note: I don't see a better way of converting bytes to a BigInt in typescript than converting to a hex string and then
		// parsing the hex string.  That is embarassing.  If better is possible, please update this!
		//
		// Note: The Rust code performs this same check by reducing and checking whether the value has changed.
		//
		// Note: The modulus is so close to 2**256 that this branch will be taken extremely rarely.
		let next_offset = BigInt(`0x${fb_hex}`);
		if (next_offset >= DerivationPath.ORDER) {
			let next_input = new Uint8Array(33);
			next_input[0] = 0x01;
			next_input.set(next_chain_key, 1);
			return DerivationPath.ckd(idx, next_input, chain_code);
		}
		// Change the next_chain_key into a Uint8Array
		let next_chain_key_array = new Uint8Array(next_chain_key);

		return [new ChainCode(next_chain_key_array), next_offset];
	}
}

/* v8 ignore stop */
