import { BTC_CHANGE_DUST_THRESHOLD_SATOSHIS } from '$btc/constants/btc.constants';
import { btcAddressToOutputScript } from '$btc/utils/btc-address.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { BitcoinNetwork, CkBtcMinterDid } from '@icp-sdk/canisters/ckbtc';
import { verify } from '@noble/secp256k1';
import { Psbt } from 'bitcoinjs-lib';

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

	const psbt = new Psbt();
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
