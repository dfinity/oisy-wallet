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
	// The issuer's side blocks rippling. When both lines of a payment between two holders have it,
	// the payment cannot pass through the issuer.
	noRipplePeer: boolean;
	// The issuer approved this line, which an issuer requiring approval must do before the account
	// can hold the token.
	peerAuthorized: boolean;
	// The account froze this line, or deep-froze it, on its own side. OISY never does; another
	// account can, which stops it receiving the token.
	freeze: boolean;
	deepFreeze: boolean;
	// The issuer froze this line, or deep-froze it.
	freezePeer: boolean;
	deepFreezePeer: boolean;
}
