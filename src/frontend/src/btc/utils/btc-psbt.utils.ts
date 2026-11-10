import {
	BTC_CHANGE_DUST_THRESHOLD_SATOSHIS,
	BTC_LARGEST_OUTPUT_VSIZE
} from '$btc/constants/btc.constants';
import { ZERO } from '$lib/constants/app.constants';
import type { OptionString } from '$lib/types/string';
import { isNullishOrEmpty } from '$lib/utils/input.utils';
import { nonNullish } from '@dfinity/utils';
import type { BitcoinNetwork, CkBtcMinterDid } from '@icp-sdk/canisters/ckbtc';
import { verify } from '@noble/secp256k1';
import {
	address as btcAddressLib,
	script as btcScript,
	networks,
	opcodes,
	Psbt,
	type Network
} from 'bitcoinjs-lib';

// Final: no RBF (BIP125) and no relative lock time (BIP68).
const BTC_SEQUENCE_FINAL = 0xffffffff;

export interface BtcSendPsbtOutput {
	destination: string;
	amount: bigint;
}

export interface SignedBtcTransaction {
	txid: string;
	hex: string;
	bytes: Uint8Array;
}

// Bitcoin script helpers live here, not in `btc-address.utils`: the ICRC wallet worker imports that
// module (through `send.utils`), and bitcoinjs-lib would add about 200 KB to the worker's bundle.

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

/**
 * The vsize of the output that pays `address`: 8 bytes of value, 1 of script length and the
 * script, all non-witness.
 *
 * The size does not depend on the network, so an address for any network gets its size. A wrong
 * network is refused where the send is validated and built. Without an address, or with one that
 * does not decode, it is `BTC_LARGEST_OUTPUT_VSIZE`, so the fee it prices covers any recipient.
 */
export const btcOutputVSize = ({ address }: { address: OptionString }): number => {
	if (isNullishOrEmpty(address)) {
		return BTC_LARGEST_OUTPUT_VSIZE;
	}

	for (const network of Object.keys(BITCOIN_JS_NETWORKS) as BitcoinNetwork[]) {
		try {
			return 9 + btcAddressToOutputScript({ address, network }).length;
		} catch (_: unknown) {
			// Not an address for this network; try the next.
		}
	}

	return BTC_LARGEST_OUTPUT_VSIZE;
};

/**
 * Builds the PSBT of a send, in the layout the chain fusion signer's `build_p2wpkh_transaction`
 * builds from the same inputs, outputs and fee, byte for byte:
 *
 * - version 2 and lock time 0;
 * - the inputs in the order given, each with sequence `0xFFFFFFFF` and an empty `script_sig`;
 * - the outputs in the order given;
 * - then the change to `changeAddress`, last, and only if it is at least
 *   `BTC_CHANGE_DUST_THRESHOLD_SATOSHIS`. Smaller change goes to the miner.
 *
 * Every input gets a `witnessUtxo` with the UTXO's value and the change address's script: the
 * UTXOs are the wallet's, at its P2WPKH address, and the change returns there. If `changeAddress`
 * is not the signer's own address, signing refuses every input.
 *
 * Throws if the UTXOs do not cover the outputs and the fee, or if an address is invalid or for
 * another network.
 */
export const buildBtcSendPsbt = ({
	utxos,
	outputs,
	changeAddress,
	feeSatoshis,
	network
}: {
	utxos: CkBtcMinterDid.Utxo[];
	outputs: BtcSendPsbtOutput[];
	changeAddress: string;
	feeSatoshis: bigint;
	network: BitcoinNetwork;
}): Psbt => {
	const walletScript = Buffer.from(btcAddressToOutputScript({ address: changeAddress, network }));

	const inputsSatoshis = utxos.reduce((acc, { value }) => acc + value, ZERO);
	const outputsSatoshis = outputs.reduce((acc, { amount }) => acc + amount, ZERO);
	const changeSatoshis = inputsSatoshis - outputsSatoshis - feeSatoshis;

	if (changeSatoshis < ZERO) {
		throw new Error(
			`The UTXOs (${inputsSatoshis} sats) do not cover the outputs (${outputsSatoshis} sats) and the fee (${feeSatoshis} sats)`
		);
	}

	// The network does not change the bytes, only the addresses `psbt.txOutputs` reports.
	const psbt = new Psbt({ network: BITCOIN_JS_NETWORKS[network] });
	psbt.setVersion(2);
	psbt.setLocktime(0);

	for (const {
		outpoint: { txid, vout },
		value
	} of utxos) {
		psbt.addInput({
			// The Bitcoin canister's txid bytes are in the order the transaction serializes them.
			hash: Buffer.from(txid),
			index: vout,
			sequence: BTC_SEQUENCE_FINAL,
			witnessUtxo: { script: walletScript, value: Number(value) }
		});
	}

	for (const { destination, amount } of outputs) {
		psbt.addOutput({
			script: Buffer.from(btcAddressToOutputScript({ address: destination, network })),
			value: Number(amount)
		});
	}

	if (changeSatoshis >= BTC_CHANGE_DUST_THRESHOLD_SATOSHIS) {
		psbt.addOutput({ script: walletScript, value: Number(changeSatoshis) });
	}

	return psbt;
};

/**
 * Checks every input's signature, then finalizes the PSBT and extracts the signed transaction.
 *
 * Throws if a signature does not verify against its input's public key and sighash, or is high-S,
 * which is non-standard, so nodes would not relay the transaction. The check cannot catch a wrong
 * input value: the sighash and the signature both come from the same `witnessUtxo`. The network
 * refuses such a transaction, since BIP143 commits to the value, so no funds move.
 */
export const finalizeSignedBtcPsbt = ({ psbt }: { psbt: Psbt }): SignedBtcTransaction => {
	// `verify` refuses high-S signatures by default. It takes plain `Uint8Array`s, and a `Buffer`
	// from another realm (as in tests) does not count as one.
	const signaturesValid = psbt.validateSignaturesOfAllInputs(
		// eslint-disable-next-line local-rules/prefer-object-params -- external callback signature
		(pubkey, msghash, signature) =>
			verify(Uint8Array.from(signature), Uint8Array.from(msghash), Uint8Array.from(pubkey))
	);

	if (!signaturesValid) {
		throw new Error('A signature of the BTC transaction does not verify');
	}

	psbt.finalizeAllInputs();

	const transaction = psbt.extractTransaction();

	return {
		txid: transaction.getId(),
		hex: transaction.toHex(),
		bytes: Uint8Array.from(transaction.toBuffer())
	};
};
