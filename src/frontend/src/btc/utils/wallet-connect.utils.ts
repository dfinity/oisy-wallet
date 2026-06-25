import { btcWalletConnectDerivationPath } from '$btc/constants/wallet-connect.constants';
import type { OptionBtcAddress } from '$btc/types/address';
import type { WalletConnectBtcAccountAddresses } from '$btc/types/wallet-connect';
import { SIGNER_CANISTER_DERIVATION_PATH } from '$env/signer.env';
import { SIGNER_MASTER_PUB_KEY } from '$lib/constants/signer.constants';
import type { NetworkId } from '$lib/types/network';
import { secp256k1 } from '@dfinity/ic-pub-key/ecdsa';
import { assertNonNullish, isNullish } from '@dfinity/utils';
import type { Principal } from '@icp-sdk/core/principal';
import { Signature } from '@noble/secp256k1';
import { crypto as btcCrypto } from 'bitcoinjs-lib';

const { DerivationPath, PublicKeyWithChainCode: Secp256k1PublicKeyWithChainCode } = secp256k1;

const ZERO_CHAIN_CODE = '0000000000000000000000000000000000000000000000000000000000000000';

// Schema byte that selects the BTC sub-key inside the signer's ECDSA key tree. It must stay in
// sync with `deriveBtcAddress` in `$lib/ic-pub-key/src/cli.ts`, which derives the P2WPKH address
// from the same byte; otherwise the recovered public key would not match the address.
const BTC_DERIVATION_SCHEMA_BYTE = 0x00;

/**
 * Derive the compressed (33-byte) secp256k1 public key for the caller's BTC P2WPKH address.
 *
 * This mirrors the local derivation done in `deriveBtcAddress` (same master key + derivation path)
 * so we can recover the signature recovery id by matching the recovered key against this one.
 */
export const deriveBtcPublicKey = ({ principal }: { principal: Principal }): Uint8Array => {
	assertNonNullish(SIGNER_MASTER_PUB_KEY, 'Signer master public key is not defined');
	assertNonNullish(
		SIGNER_CANISTER_DERIVATION_PATH,
		'SIGNER_CANISTER_DERIVATION_PATH is not defined'
	);

	const derivationPath = new DerivationPath([
		Uint8Array.from(SIGNER_CANISTER_DERIVATION_PATH),
		Uint8Array.from([BTC_DERIVATION_SCHEMA_BYTE]),
		principal.toUint8Array()
	]);

	const masterKey = Secp256k1PublicKeyWithChainCode.fromString({
		public_key: SIGNER_MASTER_PUB_KEY.ecdsa.secp256k1.pubkey,
		chain_code: ZERO_CHAIN_CODE
	});

	return Uint8Array.from(masterKey.deriveSubkeyWithChainCode(derivationPath).public_key.toBuffer());
};

/**
 * Build the Reown `getAccountAddresses` response payload for a single P2WPKH account.
 *
 * OISY exposes a single static first-external Native SegWit address per network. The compressed
 * public key (hex) is derived from the caller principal and surfaced so the dApp can verify
 * signatures without an extra round-trip. The advertised BIP-84 `path` is network-aware (mainnet
 * coin type `0'`, test networks `1'`).
 *
 * Returns an empty list when the address is nullish so callers can advertise only loaded networks.
 */
export const buildBtcAccountAddresses = ({
	address,
	principal,
	networkId
}: {
	address: OptionBtcAddress;
	principal: Principal;
	networkId: NetworkId;
}): WalletConnectBtcAccountAddresses => {
	if (isNullish(address)) {
		return [];
	}

	const publicKey = Buffer.from(deriveBtcPublicKey({ principal })).toString('hex');

	return [
		{
			address,
			publicKey,
			path: btcWalletConnectDerivationPath({ networkId }),
			intention: 'payment'
		}
	];
};

/**
 * Compute the digest signed for a standard Bitcoin "signed message".
 *
 * It is the double-SHA256 of the varint-framed message:
 *   "\x18Bitcoin Signed Message:\n" || varint(len(msg)) || msg
 */
export const bitcoinSignedMessageHash = (message: string): Uint8Array => {
	const prefix = Buffer.from('\x18Bitcoin Signed Message:\n', 'latin1');
	const messageBytes = Buffer.from(message, 'utf8');
	const framed = Buffer.concat([prefix, encodeVarint(messageBytes.length), messageBytes]);

	return Uint8Array.from(btcCrypto.hash256(framed));
};

const encodeVarint = (n: number): Buffer => {
	if (n < 0xfd) {
		return Buffer.from([n]);
	}

	if (n <= 0xffff) {
		const buffer = Buffer.alloc(3);
		buffer.writeUInt8(0xfd, 0);
		buffer.writeUInt16LE(n, 1);
		return buffer;
	}

	if (n <= 0xffffffff) {
		const buffer = Buffer.alloc(5);
		buffer.writeUInt8(0xfe, 0);
		buffer.writeUInt32LE(n, 1);
		return buffer;
	}

	const buffer = Buffer.alloc(9);
	buffer.writeUInt8(0xff, 0);
	buffer.writeBigUInt64LE(BigInt(n), 1);
	return buffer;
};

const compressedPublicKeysMatch = ({ a, b }: { a: Uint8Array; b: Uint8Array }): boolean =>
	a.length === b.length && a.every((byte, index) => byte === b[index]);

/**
 * Encode a 64-byte raw `r || s` ECDSA signature as the 65-byte recoverable, base64-encoded
 * signature expected by the standard Bitcoin `signMessage` response.
 *
 * The signer (`generic_sign_with_ecdsa`) returns only `r || s` with no recovery id, so we recover
 * it by trying every candidate id (0..3) and keeping the one whose recovered compressed public key
 * equals the account's known public key. The header byte for a compressed key is `27 + recId + 4`.
 *
 * Throws if no recovery id reproduces the expected public key (which would indicate a digest /
 * derivation-path mismatch rather than a recoverable condition).
 */
export const encodeRecoverableSignature = ({
	signature,
	messageHash,
	publicKey
}: {
	signature: Uint8Array;
	messageHash: Uint8Array;
	publicKey: Uint8Array;
}): string => {
	if (signature.length !== 64) {
		throw new Error(`Unexpected ECDSA signature length: ${signature.length}, expected 64.`);
	}

	const parsed = Signature.fromCompact(signature);

	for (let recId = 0; recId < 4; recId++) {
		try {
			const recovered = parsed.addRecoveryBit(recId).recoverPublicKey(messageHash).toRawBytes(true);

			if (compressedPublicKeysMatch({ a: recovered, b: publicKey })) {
				const header = 27 + recId + 4;
				const recoverable = Buffer.concat([Buffer.from([header]), Buffer.from(signature)]);

				return recoverable.toString('base64');
			}
		} catch (_: unknown) {
			// Some recovery ids do not yield a valid point; ignore and try the next one.
		}
	}

	throw new Error('Could not recover the signature recovery id for the BTC public key.');
};
