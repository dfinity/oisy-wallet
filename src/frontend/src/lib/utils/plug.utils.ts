import type { BtcAddress } from '$btc/types/address';
import type { EthAddress } from '$eth/types/address';
import {
	PLUG_EVM_PATH_DISCRIMINATOR,
	PLUG_HELPER_CANISTER_ID,
	PLUG_IC_DERIVATION_PATH_PREFIX,
	PLUG_ZERO_CHAIN_CODE
} from '$lib/constants/plug.constants';
import { SIGNER_MASTER_PUB_KEYS } from '$lib/constants/signer.constants';
import type { PlugAccount } from '$lib/types/plug';
import type { SolAddress } from '$sol/types/address';
import { secp256k1 } from '@dfinity/ic-pub-key/ecdsa';
import { bip340secp256k1, ed25519 } from '@dfinity/ic-pub-key/schnorr';
import { isNullish } from '@dfinity/utils';
import { Secp256k1KeyIdentity } from '@icp-sdk/core/identity/secp256k1';
import { Principal } from '@icp-sdk/core/principal';
import { HDKey } from '@scure/bip32';
import { mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { getAddressDecoder } from '@solana/kit';
import { address as btcAddress, networks } from 'bitcoinjs-lib';
import { computeAddress } from 'ethers/transaction';

// Plug is a mainnet-only product, so reproducing the addresses it shows always
// means deriving against the mainnet master keys — never the environment's
// signer key, which would silently yield addresses that hold nothing.
const MAINNET_MASTER_KEYS = SIGNER_MASTER_PUB_KEYS.key_1;

const helperCanisterBytes = (): Uint8Array =>
	Uint8Array.from(Principal.fromText(PLUG_HELPER_CANISTER_ID).toUint8Array());

const chainKeyPath = ({
	principal,
	discriminator
}: {
	principal: string;
	discriminator?: number;
}): secp256k1.DerivationPath => {
	const principalBytes = Uint8Array.from(Principal.fromText(principal).toUint8Array());

	return new secp256k1.DerivationPath([
		helperCanisterBytes(),
		...(discriminator === undefined ? [] : [Uint8Array.from([discriminator])]),
		principalBytes
	]);
};

const normalizePhrase = (phrase: string): string => phrase.trim().replace(/\s+/g, ' ');

export const isValidPlugSeedPhrase = (phrase: string): boolean =>
	validateMnemonic(normalizePhrase(phrase), wordlist);

/**
 * The only key the seed phrase actually controls. Everything else Plug shows is
 * a threshold key derived from the resulting principal.
 */
export const derivePlugIdentity = ({
	phrase,
	index
}: {
	phrase: string;
	index: number;
}): Secp256k1KeyIdentity => {
	const normalized = normalizePhrase(phrase);

	if (!validateMnemonic(normalized, wordlist)) {
		throw new Error('Invalid Plug seed phrase');
	}

	const { privateKey } = HDKey.fromMasterSeed(mnemonicToSeedSync(normalized)).derive(
		`${PLUG_IC_DERIVATION_PATH_PREFIX}/${index}`
	);

	if (isNullish(privateKey)) {
		throw new Error(`Unable to derive a Plug private key at account index ${index}`);
	}

	return Secp256k1KeyIdentity.fromSecretKey(privateKey);
};

export const derivePlugEvmAddress = (principal: string): EthAddress => {
	const derived = secp256k1.PublicKeyWithChainCode.fromString({
		public_key: MAINNET_MASTER_KEYS.ecdsa.secp256k1.pubkey,
		chain_code: PLUG_ZERO_CHAIN_CODE
	}).deriveSubkeyWithChainCode(
		chainKeyPath({ principal, discriminator: PLUG_EVM_PATH_DISCRIMINATOR })
	);

	return computeAddress(`0x${derived.public_key.toHex()}`);
};

/**
 * Plug's Bitcoin address is a P2TR output whose output key is the derived
 * BIP340 key used **directly** — no BIP341 tweak. Its canister method is named
 * `btc_p2tr_raw_key_address` for exactly that reason.
 */
export const derivePlugBtcAddress = (principal: string): BtcAddress => {
	const derived = bip340secp256k1.PublicKeyWithChainCode.fromString({
		public_key: MAINNET_MASTER_KEYS.schnorr.bip340secp256k1.pubkey,
		chain_code: PLUG_ZERO_CHAIN_CODE
	}).deriveSubkeyWithChainCode(chainKeyPath({ principal }));

	const xOnlyPublicKey = Buffer.from(derived.public_key.toHex().slice(2), 'hex');

	return btcAddress.toBech32(xOnlyPublicKey, 1, networks.bitcoin.bech32);
};

export const derivePlugSolAddress = (principal: string): SolAddress => {
	const { response } = ed25519.schnorrEd25519Derive(
		MAINNET_MASTER_KEYS.schnorr.ed25519.pubkey,
		PLUG_ZERO_CHAIN_CODE,
		chainKeyPath({ principal }).toBlob()
	);

	return getAddressDecoder().decode(
		Uint8Array.from(Buffer.from(response.public_key.toHex(), 'hex'))
	);
};

export const derivePlugAccount = ({
	phrase,
	index
}: {
	phrase: string;
	index: number;
}): PlugAccount => {
	const principal = derivePlugIdentity({ phrase, index }).getPrincipal().toText();

	return {
		index,
		principal,
		evmAddress: derivePlugEvmAddress(principal),
		btcAddress: derivePlugBtcAddress(principal),
		solAddress: derivePlugSolAddress(principal)
	};
};

export const derivePlugAccounts = ({
	phrase,
	depth
}: {
	phrase: string;
	depth: number;
}): PlugAccount[] =>
	Array.from({ length: depth }, (_, index) => derivePlugAccount({ phrase, index }));
