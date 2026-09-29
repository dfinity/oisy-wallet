import type { XrpAddress } from '$xrp/types/address';
import type { XrpCurrencyCode } from '$xrp/types/xrp-trust-line-token';

/**
 * One of the account's trust lines, as the ledger reports it from the account's side. Amounts stay
 * the ledger's decimal strings: converting them to base units is the reader's decision, because
 * some readers need the exact value.
 */
export interface XrpTrustLine {
	currency: XrpCurrencyCode;
	// The counterparty, which for a token the wallet holds is the issuer.
	issuer: XrpAddress;
	balance: string;
	limit: string;
	limitPeer: string;
	noRipple: boolean;
	// The issuer approved this line, which an issuer requiring approval must do before the account
	// can hold the token.
	peerAuthorized: boolean;
	// The issuer froze this line, or deep-froze it.
	freezePeer: boolean;
	deepFreezePeer: boolean;
}
