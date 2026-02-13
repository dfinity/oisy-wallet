/* istanbul ignore file */
/* v8 ignore start */

import { SIGNER_CANISTER_DERIVATION_PATH } from '$env/signer.env';
import { mapDerivationPath } from '$lib/utils/signer.utils.js';
import {
	DerivationPath,
	PublicKeyWithChainCode as Secp256k1PublicKeyWithChainCode
} from '@dfinity/ic-pub-key/src/ecdsa/secp256k1';
import { schnorrEd25519Derive } from '@dfinity/ic-pub-key/src/schnorr/ed25519';
import { assertNonNullish } from '@dfinity/utils';
import type { BitcoinNetwork } from '@icp-sdk/canisters/ckbtc';
import { Principal } from '@icp-sdk/core/principal';
import { networks, payments, type Network } from 'bitcoinjs-lib';
import { computeAddress } from 'ethers/transaction';

/* istanbul ignore next */
export const deriveEthAddress = ({ user, pubkey }: { user: string; pubkey: string }): string => {
	const chaincode = '0000000000000000000000000000000000000000000000000000000000000000';

	assertNonNullish(
		SIGNER_CANISTER_DERIVATION_PATH,
		'SIGNER_CANISTER_DERIVATION_PATH is not defined'
	);

	const principal = Principal.fromText(user);
	const principal_as_bytes = principal.toUint8Array();
	const derivation_path = new DerivationPath([
		Uint8Array.from(SIGNER_CANISTER_DERIVATION_PATH),
		Uint8Array.from([0x01]),
		principal_as_bytes
	]);
	const signer_pubkey_with_chain_code = Secp256k1PublicKeyWithChainCode.fromString({
		public_key: pubkey,
		chain_code: chaincode
	});
	const eth_pubkey_with_chaincode =
		signer_pubkey_with_chain_code.deriveSubkeyWithChainCode(derivation_path);
	return computeAddress(`0x${eth_pubkey_with_chaincode.public_key.toHex()}`);
};

/* istanbul ignore next */
const mapBitcoinNetworkToBitcoinJS = (network: BitcoinNetwork): Network => {
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
};

/* istanbul ignore next */
export const deriveBtcAddress = ({
	user,
	network,
	pubkey
}: {
	user: string;
	network: BitcoinNetwork;
	pubkey: string;
}): string => {
	const chaincode = '0000000000000000000000000000000000000000000000000000000000000000';

	assertNonNullish(
		SIGNER_CANISTER_DERIVATION_PATH,
		'SIGNER_CANISTER_DERIVATION_PATH is not defined'
	);

	const principal = Principal.fromText(user);
	const principal_as_bytes = principal.toUint8Array();
	const derivation_path = new DerivationPath([
		Uint8Array.from(SIGNER_CANISTER_DERIVATION_PATH),
		Uint8Array.from([0x00]),
		principal_as_bytes
	]);
	const signer_pubkey_with_chain_code = Secp256k1PublicKeyWithChainCode.fromString({
		public_key: pubkey,
		chain_code: chaincode
	});
	const btc_pubkey_with_chaincode =
		signer_pubkey_with_chain_code.deriveSubkeyWithChainCode(derivation_path);
	const btc_pubkey = btc_pubkey_with_chaincode.public_key;
	const networkJs = mapBitcoinNetworkToBitcoinJS(network);
	const { address: btc_address } = payments.p2wpkh({
		pubkey: btc_pubkey.toBuffer(),
		network: networkJs
	});
	if (btc_address === undefined) {
		throw new Error('Failed to derive Bitcoin address from public key.');
	}
	return btc_address;
};

/* istanbul ignore next */
export const deriveSolAddress = ({
	user,
	derivationPath,
	pubkey
}: {
	user: string;
	derivationPath: string[];
	pubkey: string;
}): string => {
	const chaincode = '0000000000000000000000000000000000000000000000000000000000000000';

	const principal = Principal.fromText(user);

	assertNonNullish(
		SIGNER_CANISTER_DERIVATION_PATH,
		'SIGNER_CANISTER_DERIVATION_PATH is not defined'
	);

	const derivationPathObj = new DerivationPath([
		Uint8Array.from(SIGNER_CANISTER_DERIVATION_PATH),
		Uint8Array.from([0xfe]),
		principal.toUint8Array(),
		...mapDerivationPath(derivationPath)
	]);

	const blobString = derivationPathObj.toBlob();

	const { response: schnorr_address } = schnorrEd25519Derive(pubkey, chaincode, blobString);

	return schnorr_address.public_key.toHex();
};

/* v8 ignore stop */
