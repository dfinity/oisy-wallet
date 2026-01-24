/**
 * Pure JavaScript Kaspa transaction utilities.
 * Implements transaction building, serialization, and sighash calculation
 * without requiring @kaspa/core-lib or WASM dependencies.
 */

import { blake2b } from '@noble/hashes/blake2b';
import { sha256 } from '@noble/hashes/sha256';
import { decodeKaspaAddress } from '$kaspa/utils/kaspa-bech32.utils';
import type { KaspaUtxo, KaspaSubmitTransactionRequest } from '$kaspa/types/kaspa-api';

// Kaspa transaction version
const TX_VERSION = 0;

// Sighash type for ECDSA (ALL)
const SIGHASH_ALL = 0x01;

// Kaspa-specific opcodes
const OP_DATA_33 = 0x21; // Push 33 bytes
const OP_CHECKSIGECDSA = 0xab;

// Sequence number (max value = no RBF)
const SEQUENCE_FINAL = 0xffffffffffffffffn;

// Kaspa subnetwork ID (native transactions)
const NATIVE_SUBNETWORK_ID = '0000000000000000000000000000000000000000';

/**
 * Convert a hex string to Uint8Array
 */
export const hexToBytes = (hex: string): Uint8Array => {
	if (hex.length % 2 !== 0) {
		throw new Error('Invalid hex string');
	}
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
	}
	return bytes;
};

/**
 * Convert Uint8Array to hex string
 */
export const bytesToHex = (bytes: Uint8Array): string =>
	Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');

/**
 * Write a 64-bit unsigned integer as little-endian bytes
 */
const writeUint64LE = (value: bigint): Uint8Array => {
	const bytes = new Uint8Array(8);
	for (let i = 0; i < 8; i++) {
		bytes[i] = Number((value >> BigInt(i * 8)) & 0xffn);
	}
	return bytes;
};

/**
 * Write a 32-bit unsigned integer as little-endian bytes
 */
const writeUint32LE = (value: number): Uint8Array => {
	const bytes = new Uint8Array(4);
	bytes[0] = value & 0xff;
	bytes[1] = (value >> 8) & 0xff;
	bytes[2] = (value >> 16) & 0xff;
	bytes[3] = (value >> 24) & 0xff;
	return bytes;
};

/**
 * Write a 16-bit unsigned integer as little-endian bytes
 */
const writeUint16LE = (value: number): Uint8Array => {
	const bytes = new Uint8Array(2);
	bytes[0] = value & 0xff;
	bytes[1] = (value >> 8) & 0xff;
	return bytes;
};

/**
 * Convert 5-bit words back to 8-bit bytes
 */
const fromWords = (words: number[]): Uint8Array => {
	const bytes: number[] = [];
	let bits = 0;
	let value = 0;

	for (const word of words) {
		value = (value << 5) | word;
		bits += 5;
		while (bits >= 8) {
			bits -= 8;
			bytes.push((value >> bits) & 0xff);
		}
	}

	return new Uint8Array(bytes);
};

/**
 * Extract public key from a Kaspa address.
 * Kaspa P2PK ECDSA addresses encode: [type (1 byte)] + [public key (33 bytes)]
 */
export const extractPublicKeyFromAddress = (address: string): Uint8Array | null => {
	const decoded = decodeKaspaAddress(address);
	if (!decoded) {
		return null;
	}

	// Convert 5-bit words to bytes
	const payload = fromWords(decoded.data);

	// First byte is address type (1 = ECDSA P2PK)
	// Remaining 33 bytes are the compressed public key
	if (payload.length !== 34 || payload[0] !== 1) {
		return null;
	}

	return payload.slice(1);
};

/**
 * Build a P2PK ECDSA scriptPublicKey from a compressed public key.
 * Format: OP_DATA_33 <pubkey> OP_CHECKSIGECDSA
 */
export const buildScriptPublicKey = (publicKey: Uint8Array): string => {
	if (publicKey.length !== 33) {
		throw new Error('Invalid public key length, expected 33 bytes');
	}

	const script = new Uint8Array(35);
	script[0] = OP_DATA_33;
	script.set(publicKey, 1);
	script[34] = OP_CHECKSIGECDSA;

	return bytesToHex(script);
};

/**
 * Build scriptPublicKey from a Kaspa address
 */
export const addressToScriptPublicKey = (address: string): string => {
	const publicKey = extractPublicKeyFromAddress(address);
	if (!publicKey) {
		throw new Error(`Invalid Kaspa address: ${address}`);
	}
	return buildScriptPublicKey(publicKey);
};

/**
 * Transaction input for building
 */
export interface KaspaTxInput {
	previousOutpoint: {
		transactionId: string;
		index: number;
	};
	signatureScript: string;
	sequence: bigint;
	sigOpCount: number;
	// For sighash calculation
	utxoAmount: bigint;
	utxoScriptPublicKey: string;
}

/**
 * Transaction output for building
 */
export interface KaspaTxOutput {
	amount: bigint;
	scriptPublicKey: string;
}

/**
 * Unsigned transaction structure
 */
export interface KaspaUnsignedTransaction {
	version: number;
	inputs: KaspaTxInput[];
	outputs: KaspaTxOutput[];
	lockTime: bigint;
	subnetworkId: string;
}

/**
 * Build an unsigned Kaspa transaction
 */
export const buildUnsignedTransaction = ({
	utxos,
	destinationAddress,
	destinationAmount,
	changeAddress,
	changeAmount,
	fee
}: {
	utxos: KaspaUtxo[];
	destinationAddress: string;
	destinationAmount: bigint;
	changeAddress: string;
	changeAmount: bigint;
	fee: bigint;
}): KaspaUnsignedTransaction => {
	// Build inputs from UTXOs
	const inputs: KaspaTxInput[] = utxos.map((utxo) => ({
		previousOutpoint: {
			transactionId: utxo.outpoint.transactionId,
			index: utxo.outpoint.index
		},
		signatureScript: '', // Will be filled after signing
		sequence: SEQUENCE_FINAL,
		sigOpCount: 1,
		utxoAmount: BigInt(utxo.utxoEntry.amount),
		utxoScriptPublicKey: utxo.utxoEntry.scriptPublicKey.scriptPublicKey
	}));

	// Build outputs
	const outputs: KaspaTxOutput[] = [
		{
			amount: destinationAmount,
			scriptPublicKey: addressToScriptPublicKey(destinationAddress)
		}
	];

	// Add change output if there's change
	if (changeAmount > 0n) {
		outputs.push({
			amount: changeAmount,
			scriptPublicKey: addressToScriptPublicKey(changeAddress)
		});
	}

	return {
		version: TX_VERSION,
		inputs,
		outputs,
		lockTime: 0n,
		subnetworkId: NATIVE_SUBNETWORK_ID
	};
};

/**
 * Hash domain separator for Kaspa sighash
 */
const SIGHASH_DOMAIN = 'TransactionSigningHash';

/**
 * Serialize a transaction for hashing (without signatures)
 */
const serializeTransactionForHash = (
	tx: KaspaUnsignedTransaction,
	inputIndex: number,
	sighashType: number
): Uint8Array => {
	const parts: Uint8Array[] = [];

	// Version (2 bytes, little-endian)
	parts.push(writeUint16LE(tx.version));

	// Hash of all previous outpoints
	const prevOutpointsHash = hashPreviousOutpoints(tx.inputs);
	parts.push(prevOutpointsHash);

	// Hash of all sequences
	const sequencesHash = hashSequences(tx.inputs);
	parts.push(sequencesHash);

	// Hash of all sigOpCounts
	const sigOpCountsHash = hashSigOpCounts(tx.inputs);
	parts.push(sigOpCountsHash);

	// Current input's previous outpoint
	const currentInput = tx.inputs[inputIndex];
	parts.push(hexToBytes(currentInput.previousOutpoint.transactionId));
	parts.push(writeUint32LE(currentInput.previousOutpoint.index));

	// Current input's UTXO script and amount
	// Format: script version (2 bytes) + script length (8 bytes) + script + amount (8 bytes)
	const scriptPubKey = hexToBytes(currentInput.utxoScriptPublicKey);
	parts.push(writeUint16LE(0)); // Script version (always 0)
	parts.push(writeUint64LE(BigInt(scriptPubKey.length)));
	parts.push(scriptPubKey);
	parts.push(writeUint64LE(currentInput.utxoAmount));

	// Current input's sequence
	parts.push(writeUint64LE(currentInput.sequence));

	// Current input's sigOpCount
	parts.push(new Uint8Array([currentInput.sigOpCount]));

	// Hash of all outputs
	const outputsHash = hashOutputs(tx.outputs);
	parts.push(outputsHash);

	// Lock time (8 bytes, little-endian)
	parts.push(writeUint64LE(tx.lockTime));

	// Subnetwork ID
	parts.push(hexToBytes(tx.subnetworkId));

	// Gas (0 for native transactions)
	parts.push(writeUint64LE(0n));

	// Hash of payload - for native transactions with empty payload, use zero hash
	// This is critical: zero hash, not blake2b of empty data
	const zeroHash = new Uint8Array(32); // All zeros
	parts.push(zeroHash);

	// Sighash type
	parts.push(new Uint8Array([sighashType]));

	// Concatenate all parts
	const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
	const serialized = new Uint8Array(totalLength);
	let offset = 0;
	for (const part of parts) {
		serialized.set(part, offset);
		offset += part.length;
	}

	return serialized;
};

/**
 * Blake2b hash with "TransactionSigningHash" as key
 */
const blake2bWithKey = (data: Uint8Array): Uint8Array => {
	const key = new TextEncoder().encode(SIGHASH_DOMAIN);
	return blake2b(data, { dkLen: 32, key: key });
};

/**
 * Hash all previous outpoints
 */
const hashPreviousOutpoints = (inputs: KaspaTxInput[]): Uint8Array => {
	const parts: Uint8Array[] = [];
	for (const input of inputs) {
		parts.push(hexToBytes(input.previousOutpoint.transactionId));
		parts.push(writeUint32LE(input.previousOutpoint.index));
	}
	const combined = concatArrays(parts);
	return blake2bWithKey(combined);
};

/**
 * Hash all sequences
 */
const hashSequences = (inputs: KaspaTxInput[]): Uint8Array => {
	const parts: Uint8Array[] = [];
	for (const input of inputs) {
		parts.push(writeUint64LE(input.sequence));
	}
	const combined = concatArrays(parts);
	return blake2bWithKey(combined);
};

/**
 * Hash all sigOpCounts
 */
const hashSigOpCounts = (inputs: KaspaTxInput[]): Uint8Array => {
	const parts: Uint8Array[] = [];
	for (const input of inputs) {
		parts.push(new Uint8Array([input.sigOpCount]));
	}
	const combined = concatArrays(parts);
	return blake2bWithKey(combined);
};

/**
 * Hash all outputs
 */
const hashOutputs = (outputs: KaspaTxOutput[]): Uint8Array => {
	const parts: Uint8Array[] = [];
	for (const output of outputs) {
		parts.push(writeUint64LE(output.amount));

		// Script public key version (always 0)
		parts.push(writeUint16LE(0));

		// Script public key
		const script = hexToBytes(output.scriptPublicKey);
		parts.push(writeUint64LE(BigInt(script.length)));
		parts.push(script);
	}
	const combined = concatArrays(parts);
	return blake2bWithKey(combined);
};

/**
 * Concatenate multiple Uint8Arrays
 */
const concatArrays = (arrays: Uint8Array[]): Uint8Array => {
	const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
	const result = new Uint8Array(totalLength);
	let offset = 0;
	for (const arr of arrays) {
		result.set(arr, offset);
		offset += arr.length;
	}
	return result;
};

/**
 * Calculate Schnorr sighash for a specific input (intermediate step for ECDSA)
 */
const calculateSchnorrSighash = (
	tx: KaspaUnsignedTransaction,
	inputIndex: number,
	sighashType: number = SIGHASH_ALL
): Uint8Array => {
	// Serialize transaction for this input
	const serialized = serializeTransactionForHash(tx, inputIndex, sighashType);

	// Blake2b with "TransactionSigningHash" as KEY
	return blake2bWithKey(serialized);
};

/**
 * ECDSA domain hash: SHA256("TransactionSigningHashECDSA")
 */
const getEcdsaDomainHash = (): Uint8Array => {
	const domain = new TextEncoder().encode('TransactionSigningHashECDSA');
	return sha256(domain);
};

/**
 * Calculate ECDSA sighash for a specific input
 * ECDSA sighash = SHA256(ECDSA_domain_hash || Schnorr_sighash)
 */
export const calculateSighash = (
	tx: KaspaUnsignedTransaction,
	inputIndex: number,
	sighashType: number = SIGHASH_ALL
): Uint8Array => {
	// First calculate the Schnorr sighash
	const schnorrHash = calculateSchnorrSighash(tx, inputIndex, sighashType);

	// Get ECDSA domain hash
	const domainHash = getEcdsaDomainHash();

	// Concatenate domain_hash || schnorr_hash
	const preimage = new Uint8Array(domainHash.length + schnorrHash.length);
	preimage.set(domainHash, 0);
	preimage.set(schnorrHash, domainHash.length);

	// Final ECDSA sighash = SHA256(preimage)
	return sha256(preimage);
};

/**
 * Calculate sighashes for all inputs
 */
export const calculateAllSighashes = (
	tx: KaspaUnsignedTransaction
): { sighashes: Uint8Array[]; inputIndices: number[] } => {
	const sighashes: Uint8Array[] = [];
	const inputIndices: number[] = [];

	for (let i = 0; i < tx.inputs.length; i++) {
		sighashes.push(calculateSighash(tx, i));
		inputIndices.push(i);
	}

	return { sighashes, inputIndices };
};

/**
 * Build signature script from ECDSA signature.
 * Format: [length_prefix][signature][sighash_type]
 * - length_prefix: 1 byte = signature.length + 1 (65 for 64-byte sig + 1-byte sighash type)
 * - signature: 64 bytes (r || s)
 * - sighash_type: 1 byte (0x01 for SigHashAll)
 */
export const buildSignatureScript = (signature: Uint8Array, _publicKey: Uint8Array): string => {
	// Total script: length_prefix (1) + signature (64) + sighash_type (1) = 66 bytes
	const script = new Uint8Array(1 + signature.length + 1);

	// Length prefix = signature length + sighash type byte
	script[0] = signature.length + 1; // 65 = 0x41

	// Raw signature (64 bytes)
	script.set(signature, 1);

	// Sighash type (SigHashAll = 0x01)
	script[script.length - 1] = SIGHASH_ALL;

	return bytesToHex(script);
};

/**
 * Apply signatures to a transaction
 */
export const applySignatures = (
	tx: KaspaUnsignedTransaction,
	signatures: Uint8Array[],
	publicKey: Uint8Array
): KaspaUnsignedTransaction => {
	if (signatures.length !== tx.inputs.length) {
		throw new Error('Number of signatures must match number of inputs');
	}

	const signedInputs = tx.inputs.map((input, index) => ({
		...input,
		signatureScript: buildSignatureScript(signatures[index], publicKey)
	}));

	return {
		...tx,
		inputs: signedInputs
	};
};

/**
 * Convert transaction to API submission format
 */
export const transactionToApiFormat = (
	tx: KaspaUnsignedTransaction
): KaspaSubmitTransactionRequest => ({
	transaction: {
		version: tx.version,
		inputs: tx.inputs.map((input) => ({
			previousOutpoint: {
				transactionId: input.previousOutpoint.transactionId,
				index: input.previousOutpoint.index
			},
			signatureScript: input.signatureScript,
			sequence: input.sequence.toString(),
			sigOpCount: input.sigOpCount
		})),
		outputs: tx.outputs.map((output) => ({
			amount: output.amount.toString(),
			scriptPublicKey: {
				scriptPublicKey: output.scriptPublicKey,
				version: 0
			}
		})),
		lockTime: tx.lockTime.toString(),
		subnetworkId: tx.subnetworkId
	}
});

/**
 * Calculate transaction ID (hash of serialized transaction)
 */
export const calculateTransactionId = (tx: KaspaUnsignedTransaction): string => {
	// Serialize the full transaction (with signatures)
	const parts: Uint8Array[] = [];

	// Version
	parts.push(writeUint16LE(tx.version));

	// Inputs count
	parts.push(writeUint64LE(BigInt(tx.inputs.length)));

	// Inputs
	for (const input of tx.inputs) {
		parts.push(hexToBytes(input.previousOutpoint.transactionId));
		parts.push(writeUint32LE(input.previousOutpoint.index));

		const sigScript = hexToBytes(input.signatureScript);
		parts.push(writeUint64LE(BigInt(sigScript.length)));
		parts.push(sigScript);

		parts.push(writeUint64LE(input.sequence));
	}

	// Outputs count
	parts.push(writeUint64LE(BigInt(tx.outputs.length)));

	// Outputs
	for (const output of tx.outputs) {
		parts.push(writeUint64LE(output.amount));
		parts.push(writeUint16LE(0)); // script version

		const script = hexToBytes(output.scriptPublicKey);
		parts.push(writeUint64LE(BigInt(script.length)));
		parts.push(script);
	}

	// Lock time
	parts.push(writeUint64LE(tx.lockTime));

	// Subnetwork
	parts.push(hexToBytes(tx.subnetworkId));

	// Gas (0 for native)
	parts.push(writeUint64LE(0n));

	// Payload (empty)
	parts.push(writeUint64LE(0n));

	const serialized = concatArrays(parts);

	// Hash with TransactionID personalization
	const personalization = new TextEncoder().encode('TransactionId\x00\x00\x00');
	return bytesToHex(
		blake2b(serialized, {
			dkLen: 32,
			personalization
		})
	);
};
