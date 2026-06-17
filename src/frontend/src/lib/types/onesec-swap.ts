import type { Token, TokenConfig, Transfer } from 'onesec-bridge';

export type OneSecStatus = NonNullable<Transfer['status']>;

export interface IcpLedgerEntry {
	token: Token;
	config: TokenConfig;
}

export const ONESEC_EXTERNAL_REF_KEYS = {
	FORWARDING_ADDRESS: 'onesec_forwarding_address',
	TRANSFER_ID: 'onesec_transfer_id',
	BASELINE_TRANSFER_ID: 'onesec_baseline_transfer_id',
	// Display + analytics metadata snapshotted at creation time. The backend
	// stores `external_refs` as opaque key/value pairs, so we use them as a
	// freeform place to persist FE-only fields without bumping candid. These
	// stay correct across page refresh / cross-session resume — and remain
	// available even when the user has since disabled the underlying token.
	AMOUNT: 'amount',
	SOURCE_TOKEN_SYMBOL: 'source_token_symbol',
	SOURCE_NETWORK_SYMBOL: 'source_network_symbol',
	DESTINATION_TOKEN_SYMBOL: 'destination_token_symbol',
	DESTINATION_NETWORK_SYMBOL: 'destination_network_symbol'
} as const;

export type OneSecExternalRefKey =
	(typeof ONESEC_EXTERNAL_REF_KEYS)[keyof typeof ONESEC_EXTERNAL_REF_KEYS];
