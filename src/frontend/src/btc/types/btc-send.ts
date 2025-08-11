import type { Utxo } from '@dfinity/ckbtc';

export class BtcAmountAssertionError extends Error {}

export enum BtcPrepareSendError {
	InsufficientBalance = 'insufficient_balance',
	InsufficientBalanceForFee = 'insufficient_balance_for_fee',
	MinimumBalance = 'minimum_btc_amount'
}

export interface UtxosFee {
	feeSatoshis: bigint;
	utxos: Utxo[];
	error?: BtcPrepareSendError;
}
