/* eslint-disable */
/* istanbul ignore file */
/* v8 ignore start */

import { STAGING } from '$lib/constants/app.constants';
import { schnorr_ed25519_derive } from '$lib/ic-pub-key/src/schnorr/ed25519';
import { mapDerivationPath } from '$lib/utils/signer.utils.js';
import type { BitcoinNetwork } from '@dfinity/ckbtc';
import { Principal } from '@dfinity/principal';
import { networks, payments, type Network } from 'bitcoinjs-lib';
import { computeAddress } from 'ethers/transaction';
import {
	DerivationPath,
	PublicKeyWithChainCode as Secp256k1PublicKeyWithChainCode
} from './ecdsa/secp256k1.js';

/* istanbul ignore next */
export const deriveEthAddress = async (user: string, pubkey: string): Promise<string> => {
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

/* istanbul ignore next */
function mapBitcoinNetworkToBitcoinJS(network: BitcoinNetwork): Network {
	switch (network) {
		case 'mainnet':
			return networks.bitcoin;
		case 'testnet':
			return networks.testnet;
		case 'regtest':
			return networks.regtest;
		default:
			throw new Error(`Unsupported Bitcoin network: ${network}`);
	}
}

/* istanbul ignore next */
export const deriveBtcAddress = async (
	user: string,
	pubkey: string,
	network: BitcoinNetwork
): Promise<string> => {
	const chaincode = 'f666a98c7f70fe281ca8142f14eb4d1e0934a439237da83869e2cfd924b270c0';

	let principal = Principal.fromText(user);
	let principal_as_bytes = principal.toUint8Array();
	let derivation_path = new DerivationPath([Uint8Array.from([0x00]), principal_as_bytes]);
	let signer_pubkey_with_chain_code = Secp256k1PublicKeyWithChainCode.fromString({
		public_key: pubkey,
		chain_code: chaincode
	});
	let btc_pubkey_with_chaincode =
		await signer_pubkey_with_chain_code.deriveSubkeyWithChainCode(derivation_path);
	let btc_pubkey = btc_pubkey_with_chaincode.public_key;
	let networkJs = mapBitcoinNetworkToBitcoinJS(network);
	let { address: btc_address } = payments.p2wpkh({
		pubkey: btc_pubkey.toBuffer(),
		network: networkJs
	});
	if (btc_address === undefined) {
		throw new Error('Failed to derive Bitcoin address from public key.');
	}
	return btc_address;
};

/* istanbul ignore next */
export const deriveSolAddress = async (
	user: string,
	pubkey: string,
	derivationPath: string[]
): Promise<string> => {
	const chaincode = '0000000000000000000000000000000000000000000000000000000000000000';

	const principal = Principal.fromText(user);

	let derivationPathObj = new DerivationPath([
		Uint8Array.from(
			STAGING ? [0, 0, 0, 0, 0, 96, 0, 209, 1, 1] : [0, 0, 0, 0, 2, 48, 0, 113, 1, 1]
		),
		Uint8Array.from([0xfe]),
		principal.toUint8Array(),
		...mapDerivationPath(derivationPath)
	]);

	const blobString = derivationPathObj.toBlob();

	let schnorr_address = schnorr_ed25519_derive(pubkey, chaincode, blobString);

	return schnorr_address;
};

/* v8 ignore stop */
