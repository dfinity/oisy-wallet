/**
 * Kaspa Send Services
 *
 * Handles building, signing, and broadcasting Kaspa transactions using:
 * - Pure JavaScript transaction building (no WASM dependencies)
 * - ICP threshold ECDSA for secure signing
 * - Kaspa public API for broadcasting
 */

import type { KaspaAddress } from '$kaspa/types/address';
import type { KaspaUtxo } from '$kaspa/types/kaspa-api';
import {
	type KaspaNetworkType,
	type KaspaSignedTransaction,
	type KaspaUtxosFee,
	KaspaSendError,
	KaspaSendValidationError,
	KASPA_DUST_THRESHOLD
} from '$kaspa/types/kaspa-send';
import {
	getKaspaFeeEstimate,
	getKaspaUtxos,
	submitKaspaTransaction
} from '$kaspa/providers/kaspa-api.providers';
import {
	buildUnsignedTransaction,
	calculateAllSighashes,
	applySignatures,
	transactionToApiFormat
} from '$kaspa/utils/kaspa-transaction.utils';
import { isKaspaAddress } from '$kaspa/utils/kaspa-address.utils';
import { signWithGenericEcdsa } from '$lib/api/signer.api';
import type { OptionIdentity } from '$lib/types/identity';
import { assertNonNullish } from '@dfinity/utils';
import { i18n } from '$lib/stores/i18n.store';
import { get } from 'svelte/store';

// Kaspa ECDSA key configuration
const KASPA_ECDSA_KEY_ID = {
	name: 'dfx_test_key',
	curve: { secp256k1: null } as const
};

const KASPA_DERIVATION_PATH_MAINNET = ['kaspa', 'mainnet'];
const KASPA_DERIVATION_PATH_TESTNET = ['kaspa', 'testnet'];

/**
 * Select UTXOs for a transaction and calculate fees
 */
export const selectUtxosForSend = async ({
	address,
	amount,
	network
}: {
	address: KaspaAddress;
	amount: bigint;
	network: KaspaNetworkType;
}): Promise<KaspaUtxosFee> => {
	// Fetch UTXOs from the API
	const utxos = await getKaspaUtxos({ address, network });

	if (utxos.length === 0) {
		return {
			selectedUtxos: [],
			fee: 0n,
			change: 0n,
			error: KaspaSendError.NoUtxos
		};
	}

	// Get current fee estimate
	const feeEstimate = await getKaspaFeeEstimate(network);
	const feeRate = feeEstimate.priorityBucket.feerate;

	// Sort UTXOs by amount (largest first for fewer inputs)
	const sortedUtxos = [...utxos].sort(
		(a, b) => parseInt(b.utxoEntry.amount, 10) - parseInt(a.utxoEntry.amount, 10)
	);

	// Select UTXOs greedily
	const selectedUtxos: KaspaUtxo[] = [];
	let totalInput = 0n;
	const targetAmount = amount;

	// Estimate fee based on transaction structure
	// Kaspa uses mass-based fees: mass = inputMass + outputMass + baseMass
	// Simplified estimation: ~1000 mass per input, ~500 mass per output, ~100 base
	const estimateFee = (numInputs: number, numOutputs: number): bigint => {
		const mass = numInputs * 1000 + numOutputs * 500 + 100;
		return BigInt(Math.ceil(mass * feeRate));
	};

	for (const utxo of sortedUtxos) {
		selectedUtxos.push(utxo);
		totalInput += BigInt(utxo.utxoEntry.amount);

		// Estimate fee with current inputs and 2 outputs (recipient + change)
		const estimatedFee = estimateFee(selectedUtxos.length, 2);
		const totalRequired = targetAmount + estimatedFee;

		if (totalInput >= totalRequired) {
			const change = totalInput - targetAmount - estimatedFee;

			// Check if change is dust
			if (change > 0n && change < KASPA_DUST_THRESHOLD) {
				// Add change to fee instead of creating dust output
				return {
					selectedUtxos,
					fee: estimatedFee + change,
					change: 0n
				};
			}

			return {
				selectedUtxos,
				fee: estimatedFee,
				change
			};
		}
	}

	// Not enough funds
	return {
		selectedUtxos,
		fee: 0n,
		change: 0n,
		error: KaspaSendError.InsufficientBalance
	};
};

/**
 * Sign all transaction inputs using threshold ECDSA
 */
const signTransactionInputs = async ({
	sighashes,
	identity,
	network
}: {
	sighashes: Uint8Array[];
	identity: OptionIdentity;
	network: KaspaNetworkType;
}): Promise<Uint8Array[]> => {
	assertNonNullish(identity, get(i18n).auth.error.no_internet_identity);

	const derivationPath =
		network === 'mainnet' ? KASPA_DERIVATION_PATH_MAINNET : KASPA_DERIVATION_PATH_TESTNET;

	const signatures: Uint8Array[] = [];

	// Sign each input
	for (const sighash of sighashes) {
		// Sign the sighash using threshold ECDSA
		const signatureBytes = await signWithGenericEcdsa({
			identity,
			messageHash: sighash,
			derivationPath,
			keyId: KASPA_ECDSA_KEY_ID
		});

		signatures.push(new Uint8Array(signatureBytes));
	}

	return signatures;
};

/**
 * Main function to send Kaspa
 */
export const sendKaspa = async ({
	identity,
	source,
	destination,
	amount,
	network,
	publicKey
}: {
	identity: OptionIdentity;
	source: KaspaAddress;
	destination: KaspaAddress;
	amount: bigint;
	network: KaspaNetworkType;
	publicKey: Uint8Array;
}): Promise<KaspaSignedTransaction> => {
	assertNonNullish(identity, get(i18n).auth.error.no_internet_identity);

	// Validate amount
	if (amount <= 0n) {
		throw new KaspaSendValidationError(KaspaSendError.InvalidAmount);
	}

	if (amount < KASPA_DUST_THRESHOLD) {
		throw new KaspaSendValidationError(KaspaSendError.DustAmount);
	}

	// Select UTXOs and calculate fee
	const { selectedUtxos, fee, change, error: utxoError } = await selectUtxosForSend({
		address: source,
		amount,
		network
	});

	if (utxoError) {
		throw new KaspaSendValidationError(utxoError);
	}

	// Build unsigned transaction using pure JS
	const unsignedTx = buildUnsignedTransaction({
		utxos: selectedUtxos,
		destinationAddress: destination,
		destinationAmount: amount,
		changeAddress: source,
		changeAmount: change,
		fee
	});

	// Calculate sighashes for all inputs
	const { sighashes } = calculateAllSighashes(unsignedTx);

	// Sign all inputs using threshold ECDSA
	const signatures = await signTransactionInputs({
		sighashes,
		identity,
		network
	});

	// Apply signatures to the transaction
	const signedTx = applySignatures(unsignedTx, signatures, publicKey);

	// Convert to API format and broadcast
	const apiTransaction = transactionToApiFormat(signedTx);
	const { transactionId } = await submitKaspaTransaction({
		transaction: apiTransaction,
		network
	});

	return {
		signedTxHex: JSON.stringify(apiTransaction),
		txId: transactionId
	};
};

/**
 * Validate a Kaspa send request without executing it
 */
export const validateKaspaSend = async ({
	source,
	destination,
	amount,
	network
}: {
	source: KaspaAddress;
	destination: KaspaAddress;
	amount: bigint;
	network: KaspaNetworkType;
}): Promise<KaspaUtxosFee> => {
	// Validate amount
	if (amount <= 0n) {
		return {
			selectedUtxos: [],
			fee: 0n,
			change: 0n,
			error: KaspaSendError.InvalidAmount
		};
	}

	if (amount < KASPA_DUST_THRESHOLD) {
		return {
			selectedUtxos: [],
			fee: 0n,
			change: 0n,
			error: KaspaSendError.DustAmount
		};
	}

	// Validate destination address format
	if (!isKaspaAddress({ address: destination })) {
		return {
			selectedUtxos: [],
			fee: 0n,
			change: 0n,
			error: KaspaSendError.InvalidDestination
		};
	}

	// Select UTXOs and calculate fee
	return selectUtxosForSend({
		address: source,
		amount,
		network
	});
};
