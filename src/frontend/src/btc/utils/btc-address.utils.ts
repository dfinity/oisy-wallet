import type { BtcAddress } from '$declarations/backend/backend.did';
import { assertNever, isNullish, nonNullish } from '@dfinity/utils';
import {
	BtcAddressType,
	parseBtcAddress as parseBtcAddressCkbtc,
	type BitcoinNetwork,
	type BtcAddressInfo,
	type BtcAddress as BtcAddressTypeObjType
} from '@icp-sdk/canisters/ckbtc';
import {
	address as btcAddressLib,
	script as btcScript,
	networks,
	opcodes,
	type Network
} from 'bitcoinjs-lib';

const createBtcAddressFromAddressInfo = ({ info }: { info: BtcAddressInfo }): BtcAddress => {
	switch (info.type) {
		case BtcAddressType.P2wpkhV0:
			return { P2WPKH: info.address };
		case BtcAddressType.P2pkh:
			return { P2PKH: info.address };
		case BtcAddressType.P2sh:
			return { P2SH: info.address };
		case BtcAddressType.P2wsh:
			return { P2WSH: info.address };
		case BtcAddressType.P2tr:
			return { P2TR: info.address };
		default:
			// This should never happen if the BtcAddressType enum is exhaustive
			throw new Error(`Unsupported Bitcoin address type: ${info.type}`);
	}
};

export const parseBtcAddress = (address: string): BtcAddress | undefined => {
	try {
		const info = parseBtcAddressCkbtc({ address });
		return createBtcAddressFromAddressInfo({ info });
	} catch (_: unknown) {
		return undefined;
	}
};

export const getBtcAddressString = (address: BtcAddress): string => {
	if ('P2WPKH' in address) {
		return address.P2WPKH;
	}
	if ('P2PKH' in address) {
		return address.P2PKH;
	}
	if ('P2SH' in address) {
		return address.P2SH;
	}
	if ('P2WSH' in address) {
		return address.P2WSH;
	}
	if ('P2TR' in address) {
		return address.P2TR;
	}

	assertNever(address, `Unexpected BtcAddress: ${address}`);
};

export const isBtcAddress = (address: BtcAddressTypeObjType | undefined): boolean => {
	if (isNullish(address)) {
		return false;
	}

	try {
		parseBtcAddressCkbtc(address);
		return true;
	} catch (_: unknown) {
		return false;
	}
};

export const invalidBtcAddress = (address: BtcAddressTypeObjType | undefined): boolean =>
	!isBtcAddress(address);

const BITCOIN_JS_NETWORKS: Record<BitcoinNetwork, Network> = {
	mainnet: networks.bitcoin,
	testnet: networks.testnet,
	regtest: networks.regtest
};

const decodeBech32Address = (
	address: string
): ReturnType<typeof btcAddressLib.fromBech32> | undefined => {
	try {
		return btcAddressLib.fromBech32(address);
	} catch (_: unknown) {
		return undefined;
	}
};

/**
 * The output script that pays `address` in a transaction on `network`.
 *
 * It decodes the address and compiles the standard script itself, rather than calling
 * `address.toOutputScript`. In bitcoinjs-lib 6, that builds P2TR scripts through `payments.p2tr`,
 * which throws without `initEccLib`, and the frontend has no ECC library. A P2TR key is not checked
 * to be a valid x-only point; relay policy does not check that either.
 *
 * Throws if the address is invalid, of an unsupported type, or for another network. A script
 * carries no network: `bc1q…` and `tb1q…` with the same program compile to the same bytes. So this
 * is where an address for the wrong network is refused, before anything is signed.
 */
export const btcAddressToOutputScript = ({
	address,
	network
}: {
	address: string;
	network: BitcoinNetwork;
}): Uint8Array => {
	const { bech32, pubKeyHash, scriptHash } = BITCOIN_JS_NETWORKS[network];

	const segwitAddress = decodeBech32Address(address);

	if (nonNullish(segwitAddress)) {
		const { prefix, version, data } = segwitAddress;

		if (prefix !== bech32) {
			throw new Error(`Bitcoin address ${address} is not a ${network} address`);
		}

		// P2WPKH (a 20-byte program) or P2WSH (a 32-byte one).
		if (version === 0 && (data.length === 20 || data.length === 32)) {
			return Uint8Array.from(btcScript.compile([opcodes.OP_0, data]));
		}

		// P2TR.
		if (version === 1 && data.length === 32) {
			return Uint8Array.from(btcScript.compile([opcodes.OP_1, data]));
		}

		throw new Error(`Unsupported Bitcoin address type: ${address}`);
	}

	// Testnet and regtest share their Base58 versions.
	const { version, hash } = btcAddressLib.fromBase58Check(address);

	if (version === pubKeyHash) {
		return Uint8Array.from(
			btcScript.compile([
				opcodes.OP_DUP,
				opcodes.OP_HASH160,
				hash,
				opcodes.OP_EQUALVERIFY,
				opcodes.OP_CHECKSIG
			])
		);
	}

	if (version === scriptHash) {
		return Uint8Array.from(btcScript.compile([opcodes.OP_HASH160, hash, opcodes.OP_EQUAL]));
	}

	throw new Error(`Bitcoin address ${address} is not a ${network} address`);
};
