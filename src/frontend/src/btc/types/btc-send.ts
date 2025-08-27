import type { Utxo } from '@dfinity/ckbtc';

export class BtcAmountAssertionError extends Error {}

export enum BtcPrepareSendError {
	InsufficientBalance = 'insufficient_balance',
	InsufficientBalanceForFee = 'insufficient_balance_for_fee',
	MinimumBalance = 'minimum_btc_amount',
	PendingTransactionsNotAvailable = 'pending_transactions_not_available',
	UtxoLocked = 'utxo_locked'
}

export class BtcValidationError extends Error {
	constructor(public readonly type: BtcSendValidationError) {
		super(type.toString());
		this.name = 'BtcSendValidationError';
	}
}

export enum BtcSendValidationError {
	InsufficientBalance = 'InsufficientBalance',
	InsufficientBalanceForFee = 'InsufficientBalanceForFee',
	InvalidUtxoData = 'InvalidUtxoData',
	UtxoLocked = 'UtxoLocked',
	PendingTransactionsNotAvailable = 'PendingTransactionsNotAvailable',
	InvalidFeeCalculation = 'InvalidFeeCalculation',
	MinimumBalance = 'MinimumBalance',
	AuthenticationRequired = 'AuthenticationRequired',
	NoNetworkId = 'NoNetworkId',
	InvalidDestination = 'InvalidDestination',
	InvalidAmount = 'InvalidAmount',
	UtxoFeeMissing = 'UtxoFeeMissing',
	TokenUndefined = 'TokenUndefined'
}

export interface UtxosFee {
	feeSatoshis: bigint;
	utxos: Utxo[];
	error?: BtcPrepareSendError | BtcSendValidationError;
}
