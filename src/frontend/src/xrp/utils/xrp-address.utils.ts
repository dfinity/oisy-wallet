import type { Address } from '$lib/types/address';
import { isNullish } from '@dfinity/utils';
import { crypto as bitcoinCrypto } from 'bitcoinjs-lib';
import { encodeAccountID, isValidClassicAddress } from 'ripple-address-codec';

// XRPL Ed25519 public keys are the 32-byte key prefixed with 0xED to form the
// 33-byte canonical public key used for account-ID derivation.
const XRP_ED25519_PREFIX = 0xed;
const XRP_ED25519_PUBLIC_KEY_LENGTH = 32;

export const isXrpAddress = (address: Address | undefined): boolean => {
	if (isNullish(address)) {
		return false;
	}

	return isValidClassicAddress(address);
};

export const invalidXrpAddress = (address: Address | undefined): boolean => !isXrpAddress(address);

// Derives an XRPL classic (r...) address from a raw 32-byte Ed25519 public key:
// accountId = RIPEMD160(SHA256(0xED ‖ pubkey)), address = base58check(accountId).
export const mapEd25519PublicKeyToClassicAddress = (publicKey: Uint8Array): string => {
	if (publicKey.length !== XRP_ED25519_PUBLIC_KEY_LENGTH) {
		throw new Error(
			`Invalid Ed25519 public key length: expected ${XRP_ED25519_PUBLIC_KEY_LENGTH} bytes, got ${publicKey.length}.`
		);
	}

	const canonicalPublicKey = Buffer.concat([
		Buffer.from([XRP_ED25519_PREFIX]),
		Buffer.from(publicKey)
	]);

	return encodeAccountID(bitcoinCrypto.hash160(canonicalPublicKey));
};
