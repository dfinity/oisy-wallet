import { XRP_MAINNET_NETWORK } from '$env/networks/networks.xrp.env';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import rlusd from '$xrp/assets/rlusd.svg';
import { XRP_TRUST_LINE_TOKEN_DECIMALS } from '$xrp/constants/xrp.constants';
import type {
	RequiredXrpTrustLineToken,
	XrpTrustLineTokenIdentity
} from '$xrp/types/xrp-trust-line-token';
import { xrpTrustLineIdentifier } from '$xrp/utils/xrp-trust-line.utils';

// The ASCII of "RLUSD", zero-padded to a 160-bit code, and the account Ripple issues it from.
const RLUSD_IDENTITY: XrpTrustLineTokenIdentity = {
	currency: '524C555344000000000000000000000000000000',
	issuer: 'rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De'
};

export const RLUSD_SYMBOL = 'RLUSD';

// From the currency and the issuer, never the ticker: saved Activity filters and the IndexedDB
// transaction cache key on the id's description, and any account can issue a token called RLUSD.
export const RLUSD_TOKEN_ID: TokenId = parseTokenId(xrpTrustLineIdentifier(RLUSD_IDENTITY));

export const RLUSD_TOKEN: RequiredXrpTrustLineToken = {
	id: RLUSD_TOKEN_ID,
	network: XRP_MAINNET_NETWORK,
	standard: { code: 'xrp-trust-line' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STABLECOIN }],
	name: 'Ripple USD',
	symbol: RLUSD_SYMBOL,
	decimals: XRP_TRUST_LINE_TOKEN_DECIMALS,
	// A neutral placeholder until the official asset is sourced.
	icon: rlusd,
	...RLUSD_IDENTITY
};
