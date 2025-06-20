/* eslint-disable */
/* istanbul ignore file */
/* v8 ignore start */

import { Principal } from '@dfinity/principal';
import { computeAddress } from 'ethers/transaction';
import {
	DerivationPath,
	PublicKeyWithChainCode as Secp256k1PublicKeyWithChainCode
} from './ecdsa/secp256k1.js';

/* istanbul ignore next */
export const deriveEthAddress = async (user: string): Promise<string> => {
	const pubkey = '0259761672ec7ee3bdc5eca95ba5f6a493d1133b86a76163b68af30c06fe3b75c0';
	const chaincode = 'f666a98c7f70fe281ca8142f14eb4d1e0934a439237da83869e2cfd924b270c0';

	let principal = Principal.fromText(user);
	let principal_as_bytes = principal.toUint8Array();
	let derivation_path = new DerivationPath([Uint8Array.from([0x01]), principal_as_bytes]);
	let signer_pubkey_with_chain_code = Secp256k1PublicKeyWithChainCode.fromString({
		public_key: pubkey,
		chain_code: chaincode
	});
	let eth_pubkey_with_chaincode =
		await signer_pubkey_with_chain_code.deriveSubkeyWithChainCode(derivation_path);
	return computeAddress('0x' + eth_pubkey_with_chaincode.public_key.toHex());
};

/* v8 ignore stop */
