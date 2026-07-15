import {
	bitcoinSignedMessageHash,
	buildBtcAccountAddresses,
	deriveBtcPublicKey,
	encodeRecoverableSignature
} from '$btc/utils/wallet-connect.utils';
import {
	BTC_MAINNET_NETWORK_ID,
	BTC_REGTEST_NETWORK_ID,
	BTC_TESTNET_NETWORK_ID
} from '$env/networks/networks.btc.env';
import * as signerEnv from '$env/signer.env';
import * as signerConstants from '$lib/constants/signer.constants';
import type { SignerMasterPubKeys } from '$lib/types/signer';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockPrincipal } from '$tests/mocks/identity.mock';
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

		it('recovers the recovery id and produces a 65-byte base64 signature', () => {
			const messageHash = bitcoinSignedMessageHash('hello');
			const publicKey = getPublicKey(privateKey, true);

			const recovered = sign(messageHash, privateKey);
			const rawSignature = recovered.toCompactRawBytes();

			const encoded = encodeRecoverableSignature({
				signature: rawSignature,
				messageHash,
				publicKey
			});

			const decoded = Buffer.from(encoded, 'base64');

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

	describe('buildBtcAccountAddresses', () => {
		const mockMasterPubKey: NonNullable<SignerMasterPubKeys['key_1']> = {
			ecdsa: {
				secp256k1: {
					pubkey: '02f9ac345f6be6db51e1c5612cddb59e72c3d0d493c994d12035cf13257e3b1fa7'
				}
			},
			schnorr: {
				ed25519: { pubkey: '6c0824beb37621bcca6eecc237ed1bc4e64c9c59dcb85344aa7f9cc8278ee31f' }
			}
		};

		beforeEach(() => {
			vi.spyOn(signerConstants, 'SIGNER_MASTER_PUB_KEY', 'get').mockReturnValue(mockMasterPubKey);
			vi.spyOn(signerEnv, 'SIGNER_CANISTER_DERIVATION_PATH', 'get').mockReturnValue([
				0, 0, 0, 0, 0, 96, 0, 209, 1, 1
			]);
		});

		it('returns an empty list when the address is nullish', () => {
			expect(
				buildBtcAccountAddresses({
					address: undefined,
					principal: mockPrincipal,
					networkId: BTC_MAINNET_NETWORK_ID
				})
			).toEqual([]);
			expect(
				buildBtcAccountAddresses({
					address: null,
					principal: mockPrincipal,
					networkId: BTC_MAINNET_NETWORK_ID
				})
			).toEqual([]);
		});

		it('builds the Reown getAccountAddresses payload for a P2WPKH address with the mainnet path', () => {
			const expectedPublicKey = Buffer.from(
				deriveBtcPublicKey({ principal: mockPrincipal })
			).toString('hex');

			const result = buildBtcAccountAddresses({
				address: mockBtcAddress,
				principal: mockPrincipal,
				networkId: BTC_MAINNET_NETWORK_ID
			});

			expect(result).toEqual([
				{
					address: mockBtcAddress,
					publicKey: expectedPublicKey,
					path: "m/84'/0'/0'/0/0",
					intention: 'payment'
				}
			]);
		});

		it.each([BTC_TESTNET_NETWORK_ID, BTC_REGTEST_NETWORK_ID])(
			'advertises the testnet coin type for test networks',
			(networkId) => {
				const [{ path }] = buildBtcAccountAddresses({
					address: mockBtcAddress,
					principal: mockPrincipal,
					networkId
				});

				expect(path).toBe("m/84'/1'/0'/0/0");
			}
		);

		it('derives a 33-byte compressed public key', () => {
			const [{ publicKey }] = buildBtcAccountAddresses({
				address: mockBtcAddress,
				principal: mockPrincipal,
				networkId: BTC_MAINNET_NETWORK_ID
			});

			// Compressed secp256k1 public key: 33 bytes => 66 hex chars, prefixed with 0x02 / 0x03.
			expect(publicKey).toHaveLength(66);
			expect(['02', '03']).toContain(publicKey.slice(0, 2));
		});
	});
});
