import { RLUSD_TOKEN } from '$env/tokens/tokens-xrp/tokens.rlusd.env';
import { DEFAULT_TOKEN_TAGS } from '$lib/constants/token-tag.constants';
import type { Network } from '$lib/types/network';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { XRP_TRUST_LINE_TOKEN_DECIMALS } from '$xrp/constants/xrp.constants';
import type { XrpTrustLine } from '$xrp/types/xrp-trust-line';
import type {
	RequiredXrpTrustLineToken,
	XrpTrustLineCustomToken
} from '$xrp/types/xrp-trust-line-token';
import { xrpCurrencyCodeToSymbol, xrpTrustLineIdentifier } from '$xrp/utils/xrp-trust-line.utils';
import { nonNullish } from '@dfinity/utils';

// The trust-line tokens OISY lists by name and icon. Any other line is shown by its currency code.
const LISTED_XRP_TRUST_LINE_TOKENS: RequiredXrpTrustLineToken[] = [RLUSD_TOKEN];

// One id per unlisted token for the whole session, created the first time its line is seen. Balances
// are keyed by it and the lines are re-read on every tick, so a fresh id each time would orphan the
// balance the previous tick wrote.
const unlistedTokenIds = new Map<string, TokenId>();

const unlistedTokenId = (identifier: string): TokenId => {
	const existing = unlistedTokenIds.get(identifier);

	if (nonNullish(existing)) {
		return existing;
	}

	const tokenId = parseTokenId(identifier);
	unlistedTokenIds.set(identifier, tokenId);
	return tokenId;
};

/**
 * The token a trust line holds: the listed one when OISY lists its currency and issuer on this
 * network, otherwise a token named after the line's currency code. Either way it is enabled — the
 * account only has the line because the user added the token.
 */
export const toXrpTrustLineToken = ({
	line,
	network
}: {
	line: XrpTrustLine;
	network: Network;
}): XrpTrustLineCustomToken => {
	const identifier = xrpTrustLineIdentifier(line);

	const listed = LISTED_XRP_TRUST_LINE_TOKENS.find(
		(token) => token.network.id === network.id && xrpTrustLineIdentifier(token) === identifier
	);

	if (nonNullish(listed)) {
		return { ...listed, enabled: true };
	}

	const symbol = xrpCurrencyCodeToSymbol(line.currency);

	return {
		id: unlistedTokenId(identifier),
		network,
		standard: { code: 'xrp-trust-line' },
		category: 'custom',
		tags: DEFAULT_TOKEN_TAGS,
		name: symbol,
		symbol,
		decimals: XRP_TRUST_LINE_TOKEN_DECIMALS,
		currency: line.currency,
		issuer: line.issuer,
		enabled: true
	};
};
