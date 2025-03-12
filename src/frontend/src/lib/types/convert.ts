// TODO: rename the type as it will be reused in both convert and send flows
export type ConvertAmountErrorType =
	| 'insufficient-funds'
	| 'insufficient-funds-for-fee'
	| 'unknown-minimum-amount'
	| 'minimum-amount-not-reached'
	| 'amount-less-than-ledger-fee'
	| 'minter-info-not-certified'
	| undefined;
