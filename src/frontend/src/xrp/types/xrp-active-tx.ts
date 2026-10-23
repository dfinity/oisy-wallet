export const XRP_EXTERNAL_REF_KEYS = {
	// The two poll keys, and the only values the resolver needs. Both are derived
	// from the signed blob — `deriveXrpTransactionHash` and
	// `deriveXrpLedgerWindow` — so they cannot describe a different transaction
	// than the one submitted, and both are written before the submit: a submit
	// whose response is lost is precisely the case this record exists for.
	TX_HASH: 'tx_hash',
	LAST_LEDGER_SEQUENCE: 'last_ledger_sequence',
	// Display metadata snapshotted at creation. Read back from `external_refs`
	// rather than re-derived, so a row still renders in a later session — or
	// after the user has disabled the token. Reuses the `amount` key name the
	// swap providers already use so the row rendering stays shared.
	AMOUNT: 'amount',
	TOKEN_SYMBOL: 'token_symbol',
	NETWORK_SYMBOL: 'network_symbol',
	// How a swap's deposit resolved on the ledger: `tesSUCCESS`, a `tec` code, or
	// `XRP_LEDGER_RESULT_EXPIRED`. The backend lets a swap from XRP leave `Pending`
	// only with it, and only the ledger resolution writes it, so a client that
	// follows 1Click instead cannot release the address while the deposit can
	// still apply. A send's row does not carry it.
	LEDGER_RESULT: 'ledger_result'
} as const;

export const XRP_LEDGER_RESULT_EXPIRED = 'expired';

export type XrpExternalRefKey = (typeof XRP_EXTERNAL_REF_KEYS)[keyof typeof XRP_EXTERNAL_REF_KEYS];
