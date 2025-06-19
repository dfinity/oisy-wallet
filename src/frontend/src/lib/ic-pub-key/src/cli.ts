import { Principal } from '@dfinity/principal';
import { Command } from 'commander';
import { computeAddress } from 'ethers';
import {
	DerivationPath,
	PublicKeyWithChainCode as Secp256k1PublicKeyWithChainCode
} from './ecdsa/secp256k1.js';

export const program = new Command();

program
	.name('ic-pub-key')
	.description('Tools for Internet Computer Protocol public keys')
	.version('1.0.0');

let derive = program.command('derive').description('Derive a public key');

let ecdsa = derive.command('ecdsa').description('Derive an ECDSA public key');

ecdsa
	.command('secp256k1')
	.description('Derive a key')
	.requiredOption('-k, --pubkey <pubkey>', 'The parent public key', String)
	.requiredOption('-c, --chaincode <chaincode>', 'The parent chain code', String)
	.option('-d, --derivationpath <derivationpath>', 'The derivation path', String)
	.action(({ pubkey, chaincode, derivationpath }) => {
		console.log(ecdsa_secp256k1_derive(pubkey, chaincode, derivationpath));
	});

function ecdsa_secp256k1_derive(pubkey: string, chaincode: string, derivationpath: string): string {
	let pubkey_with_chain_code = Secp256k1PublicKeyWithChainCode.fromString({
		public_key: pubkey,
		chain_code: chaincode
	});
	let parsed_derivationpath = DerivationPath.fromBlob(derivationpath);
	let derived_pubkey = pubkey_with_chain_code.deriveSubkeyWithChainCode(parsed_derivationpath);
	let ans = {
		request: {
			key: pubkey_with_chain_code,
			derivation_path: parsed_derivationpath
		},
		response: derived_pubkey.toHex()
	};
	return JSON.stringify(ans, null, 2);
}

let signer = program.command('signer').description('Get chain fusion signer token address');

let eth = signer.command('eth').description('Get Ethereum address');

eth
	.command('address')
	.description("Get a user's Ethereum address")
	.addHelpText(
		'after',
		`

This is a cheap and fast way of obtaining a user's Chain Fusion Signer Ethereum address.  It is equivalent to API calls such as:

$ dfx canister call signer --with-cycles 1000000000 --ic eth_address '(record{ "principal" = opt principal "nggqm-p5ozz-i5hfv-bejmq-2gtow-4dtqw-vjatn-4b4yw-s5mzs-i46su-6ae"}, null)' --wallet "$(dfx identity get-wallet --ic)"
(
  variant {
    Ok = record { address = "0xf53e047376e37eAc56d48245B725c47410cf6F1e" }
  },
)

`
	)
	.option('-p, --pubkey <pubkey>', "The signer canister's public key", String)
	.option('-c, --chaincode <chaincode>', "The signer canister's chain code", String)
	.requiredOption('-u, --user <user>', "The user's principal", String)
	.action(({ pubkey, chaincode, user }) => {
		pubkey =
			pubkey == null
				? '0259761672ec7ee3bdc5eca95ba5f6a493d1133b86a76163b68af30c06fe3b75c0' // Production chain fusion signer's public key.
				: pubkey;
		chaincode =
			chaincode == null
				? 'f666a98c7f70fe281ca8142f14eb4d1e0934a439237da83869e2cfd924b270c0' // Production chain fusion signer's chain code.  It doesn't really matter if this is wrong.
				: chaincode;
		let principal = Principal.fromText(user);
		let principal_as_bytes = principal.toUint8Array();
		let derivation_path = new DerivationPath([Uint8Array.from([0x01]), principal_as_bytes]);
		let signer_pubkey_with_chain_code = Secp256k1PublicKeyWithChainCode.fromString({
			public_key: pubkey,
			chain_code: chaincode
		});
		let eth_pubkey_with_chaincode =
			signer_pubkey_with_chain_code.deriveSubkeyWithChainCode(derivation_path);
		let eth_pubkey = eth_pubkey_with_chaincode.public_key;

		let eth_address = computeAddress('0x' + eth_pubkey.toHex());
		let ans = {
			request: {
				pubkey,
				chaincode,
				principal: principal.toText()
			},
			response: { eth_address }
		};
		console.log(JSON.stringify(ans, null, 2));
	});
