/* eslint-disable */
/* istanbul ignore file */
/* v8 ignore start */

import { DerivationPath, PublicKeyWithChainCode } from '@dfinity/ic-pub-key/src/schnorr/ed25519';

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
