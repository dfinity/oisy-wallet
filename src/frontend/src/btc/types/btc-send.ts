import type { Utxo } from '@dfinity/ckbtc';

export class BtcAmountAssertionError extends Error {}

export enum BtcPrepareSendError {
	InsufficientBalance = 'insufficient_balance',
	InsufficientBalanceForFee = 'insufficient_balance_for_fee',
	MinimumBalance = 'minimum_btc_amount'
}

export class BtcValidationError extends Error {
	constructor(
		public readonly type: BtcSendValidationError,
		message: string
	) {
		super(message);
		this.name = 'BtcSendValidationError';
	}
}

export enum BtcSendValidationError {
	InsufficientBalance = 'insufficient_balance',
	InsufficientBalanceForFee = 'insufficient_balance_for_fee',
	MinimumBalance = 'minimum_btc_amount',
	InvalidUtxoData = 'invalid_utxo_data',
	UtxoLocked = 'utxo_locked',
	InvalidFeeCalculation = 'invalid_fee_calculation'
}

export interface UtxosFee {
	feeSatoshis: bigint;
	utxos: Utxo[];
	error?: BtcPrepareSendError;
}
