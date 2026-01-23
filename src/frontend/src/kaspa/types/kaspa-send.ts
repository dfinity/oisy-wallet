/**
 * Types for Kaspa send/transaction operations
 */

import type { KaspaAddress } from '$kaspa/types/address';
import type { KaspaUtxo } from '$kaspa/types/kaspa-api';

/**
 * Kaspa UTXO in the format expected by kaspa-core-lib Transaction.from()
 */
export interface KaspaUnspentOutput {
	txId: string;
	outputIndex: number;
	address: string;
	script: string;
	satoshis: number;
	scriptPublicKeyVersion?: number;
}

/**
 * Parameters for preparing a Kaspa send transaction
 */
export interface KaspaSendParams {
	source: KaspaAddress;
	destination: KaspaAddress;
	amount: bigint; // Amount in sompi (1 KAS = 100,000,000 sompi)
	utxos: KaspaUtxo[];
	feeRate?: number; // Fee rate in sompi per byte (optional, will use estimate if not provided)
}

/**
 * Result of preparing a Kaspa transaction
 */
export interface KaspaPreparedTransaction {
	// Serialized unsigned transaction hex
	unsignedTxHex: string;
	// Sighashes for each input that need to be signed
	sighashes: Uint8Array[];
	// Input indices corresponding to each sighash
	inputIndices: number[];
	// Fee in sompi
	fee: bigint;
	// Change amount in sompi (0 if no change)
	change: bigint;
}

/**
 * Signed transaction ready for broadcast
 */
export interface KaspaSignedTransaction {
	// Serialized signed transaction hex
	signedTxHex: string;
	// Transaction ID
	txId: string;
}

/**
 * Error types for Kaspa send operations
 */
export enum KaspaSendError {
	InsufficientBalance = 'insufficient_balance',
	InsufficientBalanceForFee = 'insufficient_balance_for_fee',
	InvalidDestination = 'invalid_destination',
	InvalidAmount = 'invalid_amount',
	NoUtxos = 'no_utxos',
	TransactionBuildFailed = 'transaction_build_failed',
	SigningFailed = 'signing_failed',
	BroadcastFailed = 'broadcast_failed',
	DustAmount = 'dust_amount'
}

/**
 * Validation error class for Kaspa send operations
 */
export class KaspaSendValidationError extends Error {
	constructor(public readonly type: KaspaSendError) {
		super(type.toString());
		this.name = 'KaspaSendValidationError';
	}
}

/**
 * Result type for UTXO selection and fee calculation
 */
export interface KaspaUtxosFee {
	selectedUtxos: KaspaUtxo[];
	fee: bigint;
	change: bigint;
	error?: KaspaSendError;
}

/**
 * Network type for Kaspa operations
 */
export type KaspaNetworkType = 'mainnet' | 'testnet';

/**
 * Constants for Kaspa transactions
 */
export const KASPA_DUST_THRESHOLD = 546n; // Minimum output amount in sompi
export const KASPA_SOMPI_PER_KAS = 100_000_000n; // 1 KAS = 100,000,000 sompi
export const KASPA_DEFAULT_FEE_RATE = 1; // Default fee rate in sompi per gram (mass unit)
