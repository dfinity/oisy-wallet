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
