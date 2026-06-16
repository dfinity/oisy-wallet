import {
	bitcoinSignedMessageHash,
	encodeRecoverableSignature
} from '$btc/utils/wallet-connect.utils';
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha2';
import { etc, getPublicKey, sign } from '@noble/secp256k1';

describe('btc wallet-connect.utils', () => {
	const previousHmacSha256Sync = etc.hmacSha256Sync;

	beforeAll(() => {
		// `@noble/secp256k1` v2 needs an explicit sync HMAC implementation to sign. Only the tests sign
		// here (production only recovers public keys, which needs no HMAC), so we wire it for the suite
		// and restore the previous value afterwards to avoid leaking state into other test files.
		// eslint-disable-next-line local-rules/prefer-object-params -- external callback signature
		etc.hmacSha256Sync = (key: Uint8Array, ...messages: Uint8Array[]) =>
			hmac(sha256, key, etc.concatBytes(...messages));
	});

	afterAll(() => {
		etc.hmacSha256Sync = previousHmacSha256Sync;
	});

	describe('bitcoinSignedMessageHash', () => {
		it('produces the documented digest for a known message', () => {
			// Reference vector for the standard Bitcoin signed-message hashing of "hello".
			const hash = bitcoinSignedMessageHash('hello');

			expect(Buffer.from(hash).toString('hex')).toBe(
				'cf0447ec85f0ce7150a257db32ebfcb7523dae17c36dbd1be598779fec0484f4'
			);
		});

		it('is deterministic for the same message', () => {
			expect(bitcoinSignedMessageHash('test')).toEqual(bitcoinSignedMessageHash('test'));
		});
	});

	describe('encodeRecoverableSignature', () => {
		const privateKey = Uint8Array.from(
			Buffer.from('0000000000000000000000000000000000000000000000000000000000000001', 'hex')
		);

		it('recovers the recovery id and produces a 65-byte hex signature', () => {
			const messageHash = bitcoinSignedMessageHash('hello');
			const publicKey = getPublicKey(privateKey, true);

			const recovered = sign(messageHash, privateKey);
			const rawSignature = recovered.toCompactRawBytes();

			const encoded = encodeRecoverableSignature({
				signature: rawSignature,
				messageHash,
				publicKey
			});

			expect(encoded).toHaveLength(130);
			expect(encoded).toMatch(/^[0-9a-f]+$/);

			const decoded = Buffer.from(encoded, 'hex');

			expect(decoded).toHaveLength(65);
			// Header byte for a compressed key: 27 + recId + 4.
			expect(decoded[0]).toBe(27 + (recovered.recovery ?? 0) + 4);
			expect(Uint8Array.from(decoded.subarray(1))).toEqual(rawSignature);
		});

		it('throws when no recovery id matches the public key', () => {
			const messageHash = bitcoinSignedMessageHash('hello');
			const wrongPublicKey = getPublicKey(
				Uint8Array.from(
					Buffer.from('0000000000000000000000000000000000000000000000000000000000000002', 'hex')
				),
				true
			);
			const rawSignature = sign(messageHash, privateKey).toCompactRawBytes();

			expect(() =>
				encodeRecoverableSignature({
					signature: rawSignature,
					messageHash,
					publicKey: wrongPublicKey
				})
			).toThrow();
		});

		it('throws on a signature of unexpected length', () => {
			expect(() =>
				encodeRecoverableSignature({
					signature: new Uint8Array(10),
					messageHash: bitcoinSignedMessageHash('hello'),
					publicKey: getPublicKey(privateKey, true)
				})
			).toThrow();
		});
	});
});
