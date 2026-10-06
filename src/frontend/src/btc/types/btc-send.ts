import type { CkBtcMinterDid } from '@icp-sdk/canisters/ckbtc';

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
	// The rate `feeSatoshis` was priced at. Carried with the fee rather than re-sampled by
	// the consumer: the median percentile it comes from moves between the preview and the
	// confirmation, so a second sample cannot be used to check the first.
	feeRateMiliSatoshisPerVByte: bigint;
	utxos: CkBtcMinterDid.Utxo[];
	error?: BtcPrepareSendError | BtcSendValidationError;
}
