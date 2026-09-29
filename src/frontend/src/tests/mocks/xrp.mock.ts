import type { XrpAddress } from '$xrp/types/address';
import type { XrpTrustLine } from '$xrp/types/xrp-trust-line';

export const mockXrpAddress: XrpAddress = 'rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD';

export const mockXrpAddress2: XrpAddress = 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe';

// RLUSD, Ripple's USD stablecoin: the 40-hex code is the ASCII of "RLUSD", zero-padded.
export const mockRlusdCurrencyCode = '524C555344000000000000000000000000000000';

export const mockRlusdIssuer: XrpAddress = 'rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De';

export const mockXrpTrustLine: XrpTrustLine = {
	currency: mockRlusdCurrencyCode,
	issuer: mockRlusdIssuer,
	balance: '12.5',
	limit: '9999999999999999e80',
	limitPeer: '0',
	noRipple: true,
	peerAuthorized: false,
	freezePeer: false,
	deepFreezePeer: false
};
