/**
 * Kaspa Send Services
 *
 * Handles building, signing, and broadcasting Kaspa transactions using:
 * - @kaspa/core-lib for transaction construction
 * - ICP threshold ECDSA for secure signing
 * - Kaspa public API for broadcasting
 */

import type { KaspaAddress } from '$kaspa/types/address';
import type { KaspaUtxo, KaspaSubmitTransactionRequest } from '$kaspa/types/kaspa-api';
import {
	type KaspaNetworkType,
	type KaspaPreparedTransaction,
	type KaspaSignedTransaction,
	type KaspaUnspentOutput,
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
import { signWithGenericEcdsa } from '$lib/api/signer.api';
import type { OptionIdentity } from '$lib/types/identity';
import { assertNonNullish } from '@dfinity/utils';
import { i18n } from '$lib/stores/i18n.store';
import { get } from 'svelte/store';

/**
 * Convert Uint8Array to hex string
 */
const uint8ArrayToHex = (arr: Uint8Array): string =>
	Array.from(arr)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');

// @kaspa/core-lib type definitions
// Note: These types use Uint8Array but the actual library returns Buffer-like objects
// that have toString('hex') method. We'll handle conversion in transactionToApiFormat.
interface KaspaCoreInput {
	prevTxId: Uint8Array | { toString(encoding: string): string };
	outputIndex: number;
	output: {
		script: { toBuffer(): Uint8Array; toHex?(): string };
		satoshis: number;
		satoshisBN: unknown;
	};
	sequenceNumber: number;
	addSignature(
		transaction: KaspaCoreTransaction,
		signature: KaspaCoreTransactionSignature,
		signingMethod: string
	): void;
}

interface KaspaCoreTransaction {
	from(utxos: KaspaUnspentOutput[]): KaspaCoreTransaction;
	to(address: string, amount: number): KaspaCoreTransaction;
	change(address: string): KaspaCoreTransaction;
	fee(amount: number): KaspaCoreTransaction;
	sign(privateKey: unknown): KaspaCoreTransaction;
	serialize(unsafe?: boolean): string;
	toString(): string;
	inputs: KaspaCoreInput[];
	outputs: Array<{
		satoshis: number;
		script: { toBuffer(): Uint8Array; toHex(): string };
	}>;
	id: string;
	hash: string;
	version: number;
	nLockTime: number;
}

interface KaspaCoreSignature {
	r: unknown;
	s: unknown;
	nhashtype: number;
}

interface KaspaCoreTransactionSignature {
	publicKey: unknown;
	prevTxId: Uint8Array | { toString(encoding: string): string };
	outputIndex: number;
	inputIndex: number;
	signature: KaspaCoreSignature;
	sigtype: number;
}

interface KaspaCoreSighash {
	sighash(
		transaction: KaspaCoreTransaction,
		sighashType: number,
		inputIndex: number,
		subscript: unknown,
		satoshisBN: unknown,
		flags?: number
	): Uint8Array;
}

interface KaspaCoreTransactionModule {
	new (): KaspaCoreTransaction;
	Sighash: KaspaCoreSighash;
	Signature: new (params: {
		publicKey: unknown;
		prevTxId: Uint8Array | { toString(encoding: string): string };
		outputIndex: number;
		inputIndex: number;
		signature: KaspaCoreSignature;
		sigtype: number;
	}) => KaspaCoreTransactionSignature;
}

interface KaspaCoreLib {
	initRuntime(): Promise<boolean>;
	Transaction: KaspaCoreTransactionModule;
	Address: new (address: string) => unknown;
	PublicKey: new (data: Uint8Array) => unknown;
	Script: {
		fromAddress(address: unknown): unknown;
	};
	crypto: {
		Signature: new (r?: unknown, s?: unknown) => KaspaCoreSignature;
		BN: new (data: Uint8Array | string) => unknown;
	};
}

// Lazy-loaded kaspa-core-lib module
let kaspacore: KaspaCoreLib | null = null;

/**
 * Dynamically import @kaspa/core-lib to avoid CommonJS/ESM issues
 */
const loadKaspaCoreLib = async (): Promise<KaspaCoreLib> => {
	if (kaspacore !== null) {
		return kaspacore;
	}

	// Cast to unknown first since the library's types don't exactly match our interface
	const module = await import('@kaspa/core-lib');
	kaspacore = (module.default ?? module) as unknown as KaspaCoreLib;
	return kaspacore;
};

// Kaspa ECDSA key configuration
const KASPA_ECDSA_KEY_ID = {
	name: 'dfx_test_key',
	curve: { secp256k1: null } as const
};

const KASPA_DERIVATION_PATH_MAINNET = ['kaspa', 'mainnet'];
const KASPA_DERIVATION_PATH_TESTNET = ['kaspa', 'testnet'];

// Sighash type for Kaspa (ALL | FORKID)
const SIGHASH_ALL_FORKID = 0x41;

// Track runtime initialization
let kaspaRuntimeReady = false;
let kaspaRuntimePromise: Promise<boolean> | null = null;

const ensureKaspaRuntime = async (): Promise<KaspaCoreLib> => {
	const lib = await loadKaspaCoreLib();

	if (kaspaRuntimeReady) {
		return lib;
	}

	if (!kaspaRuntimePromise) {
		kaspaRuntimePromise = lib.initRuntime();
	}

	await kaspaRuntimePromise;
	kaspaRuntimeReady = true;
	return lib;
};

/**
 * Convert API UTXO format to kaspa-core-lib UnspentOutput format
 */
const convertUtxoToUnspentOutput = (utxo: KaspaUtxo): KaspaUnspentOutput => ({
	txId: utxo.outpoint.transactionId,
	outputIndex: utxo.outpoint.index,
	address: utxo.address,
	script: utxo.utxoEntry.scriptPublicKey,
	satoshis: parseInt(utxo.utxoEntry.amount, 10)
});

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
 * Build an unsigned Kaspa transaction
 */
export const buildUnsignedTransaction = async ({
	source,
	destination,
	amount,
	utxos,
	fee,
	change
}: {
	source: KaspaAddress;
	destination: KaspaAddress;
	amount: bigint;
	utxos: KaspaUtxo[];
	fee: bigint;
	change: bigint;
}): Promise<{ transaction: KaspaCoreTransaction; unspentOutputs: KaspaUnspentOutput[] }> => {
	const lib = await ensureKaspaRuntime();

	// Convert UTXOs to the format expected by kaspa-core-lib
	const unspentOutputs = utxos.map(convertUtxoToUnspentOutput);

	// Create transaction
	const transaction = new lib.Transaction()
		.from(unspentOutputs)
		.to(destination, Number(amount))
		.fee(Number(fee));

	// Add change output if needed
	if (change > 0n) {
		transaction.change(source);
	}

	return { transaction, unspentOutputs };
};

/**
 * Get sighashes for all inputs of a transaction
 */
export const getTransactionSighashes = async (
	transaction: KaspaCoreTransaction
): Promise<{ sighashes: Uint8Array[]; inputIndices: number[] }> => {
	const lib = await ensureKaspaRuntime();
	const sighashes: Uint8Array[] = [];
	const inputIndices: number[] = [];

	for (let i = 0; i < transaction.inputs.length; i++) {
		const input = transaction.inputs[i];
		const sighash = lib.Transaction.Sighash.sighash(
			transaction,
			SIGHASH_ALL_FORKID,
			i,
			input.output.script,
			input.output.satoshisBN
		);

		sighashes.push(new Uint8Array(sighash));
		inputIndices.push(i);
	}

	return { sighashes, inputIndices };
};

/**
 * Sign all transaction inputs using threshold ECDSA
 */
export const signTransactionInputs = async ({
	transaction,
	sighashes,
	inputIndices,
	identity,
	network,
	publicKey
}: {
	transaction: KaspaCoreTransaction;
	sighashes: Uint8Array[];
	inputIndices: number[];
	identity: OptionIdentity;
	network: KaspaNetworkType;
	publicKey: Uint8Array;
}): Promise<KaspaCoreTransaction> => {
	assertNonNullish(identity, get(i18n).auth.error.no_internet_identity);

	const lib = await ensureKaspaRuntime();

	const derivationPath =
		network === 'mainnet' ? KASPA_DERIVATION_PATH_MAINNET : KASPA_DERIVATION_PATH_TESTNET;

	// Create PublicKey object from raw public key
	const pubKey = new lib.PublicKey(publicKey);

	// Sign each input
	for (let i = 0; i < sighashes.length; i++) {
		const sighash = sighashes[i];
		const inputIndex = inputIndices[i];

		// Sign the sighash using threshold ECDSA
		const signatureBytes = await signWithGenericEcdsa({
			identity,
			messageHash: sighash,
			derivationPath,
			keyId: KASPA_ECDSA_KEY_ID
		});

		// Parse the signature (64 bytes: 32 bytes r + 32 bytes s)
		const r = new lib.crypto.BN(new Uint8Array(signatureBytes.slice(0, 32)));
		const s = new lib.crypto.BN(new Uint8Array(signatureBytes.slice(32, 64)));

		// Create signature object
		const signature = new lib.crypto.Signature(r, s);
		signature.nhashtype = SIGHASH_ALL_FORKID;

		// Create transaction signature
		const input = transaction.inputs[inputIndex];
		const txSignature = new lib.Transaction.Signature({
			publicKey: pubKey,
			prevTxId: input.prevTxId,
			outputIndex: input.outputIndex,
			inputIndex,
			signature,
			sigtype: SIGHASH_ALL_FORKID
		});

		// Apply signature to transaction
		// Note: This modifies the transaction in place
		input.addSignature(transaction, txSignature, 'ecdsa');
	}

	return transaction;
};

/**
 * Convert a buffer-like object or Uint8Array to hex string
 */
const toHexString = (data: Uint8Array | { toString(encoding: string): string }): string => {
	if (typeof (data as { toString(encoding: string): string }).toString === 'function') {
		try {
			// Try Buffer-style toString first (kaspa-core-lib uses Buffer internally)
			const result = (data as { toString(encoding: string): string }).toString('hex');
			if (typeof result === 'string' && result.length > 0) {
				return result;
			}
		} catch {
			// Fall through to Uint8Array conversion
		}
	}
	return uint8ArrayToHex(data as Uint8Array);
};

/**
 * Convert a signed transaction to the format expected by the Kaspa API
 */
const transactionToApiFormat = (
	transaction: KaspaCoreTransaction
): KaspaSubmitTransactionRequest => {
	return {
		transaction: {
			version: transaction.version,
			inputs: transaction.inputs.map((input) => ({
				previousOutpoint: {
					transactionId: toHexString(input.prevTxId),
					index: input.outputIndex
				},
				signatureScript: input.output.script.toHex?.() ?? uint8ArrayToHex(input.output.script.toBuffer()),
				sequence: input.sequenceNumber.toString(),
				sigOpCount: 1
			})),
			outputs: transaction.outputs.map((output) => ({
				amount: output.satoshis.toString(),
				scriptPublicKey: {
					scriptPublicKey: output.script.toHex(),
					version: 0
				}
			})),
			lockTime: transaction.nLockTime.toString(),
			subnetworkId: '0000000000000000000000000000000000000000'
		}
	};
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

	// Build unsigned transaction
	const { transaction } = await buildUnsignedTransaction({
		source,
		destination,
		amount,
		utxos: selectedUtxos,
		fee,
		change
	});

	// Get sighashes for signing
	const { sighashes, inputIndices } = await getTransactionSighashes(transaction);

	// Sign the transaction
	const signedTransaction = await signTransactionInputs({
		transaction,
		sighashes,
		inputIndices,
		identity,
		network,
		publicKey
	});

	// Broadcast the transaction
	const apiTransaction = transactionToApiFormat(signedTransaction);
	const { transactionId } = await submitKaspaTransaction({
		transaction: apiTransaction,
		network
	});

	return {
		signedTxHex: signedTransaction.serialize(true),
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
	const lib = await ensureKaspaRuntime();
	try {
		new lib.Address(destination);
	} catch {
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
