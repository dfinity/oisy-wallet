import type { Utxo } from '@dfinity/ckbtc';

export class BtcAmountAssertionError extends Error {}

export enum BtcPrepareSendError {
	InsufficientBalance = 'insufficient_balance',
	InsufficientBalanceForFee = 'insufficient_balance_for_fee',
	AmountBelowDustThreshold = 'amount_below_dust_threshold'
}

export interface UtxosFee {
	feeSatoshis: bigint;
	utxos: Utxo[];
	error?: BtcPrepareSendError;
	errorParam?: string; // Generic string parameter for error context
}
