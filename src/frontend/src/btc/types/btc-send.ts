import type { Utxo } from '@dfinity/ckbtc';

export enum BtcPrepareSendError {
	InsufficientBalance = 'InsufficientBalance',
	InsufficientBalanceForFee = 'InsufficientBalanceForFee'
}

export interface UtxosFee {
	feeSatoshis: bigint;
	utxos: Utxo[];
	error?: BtcPrepareSendError;
}

export class BtcAmountAssertionError extends Error {}
