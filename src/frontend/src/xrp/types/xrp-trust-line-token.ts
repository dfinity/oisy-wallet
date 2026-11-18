import type { RequiredToken, Token } from '$lib/types/token';
import type { TokenToggleable } from '$lib/types/token-toggleable';
import type { XrpAddress } from '$xrp/types/address';

// A currency code as the ledger reports it: exactly 3 characters, or 40 uppercase hex characters.
export type XrpCurrencyCode = string;

export interface XrpTrustLineTokenIdentity {
	currency: XrpCurrencyCode;
	issuer: XrpAddress;
}

export type XrpTrustLineToken = Token & XrpTrustLineTokenIdentity;

export type RequiredXrpTrustLineToken = RequiredToken<XrpTrustLineToken>;

export type XrpTrustLineCustomToken = TokenToggleable<XrpTrustLineToken>;

// What a `TrustSet` does to the wallet's line for a token: open it, or take it back to its default
// state so the ledger can delete it.
export type XrpTrustSetChange = 'add' | 'remove';

// A restriction an issuer's account places on the holders of its tokens.
export type XrpIssuerPower =
	| { type: 'freeze' | 'global_freeze' | 'clawback' | 'approval' | 'no_rippling' }
	| { type: 'transfer_fee'; percent: number };
