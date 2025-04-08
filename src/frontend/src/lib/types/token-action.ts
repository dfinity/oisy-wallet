export type TokenActionErrorType =
	| 'insufficient-funds'
	| 'insufficient-funds-for-fee'
	| 'unknown-minimum-amount'
	| 'minimum-amount-not-reached'
	| 'amount-less-than-ledger-fee'
	| 'minter-info-not-certified'
	| undefined;
