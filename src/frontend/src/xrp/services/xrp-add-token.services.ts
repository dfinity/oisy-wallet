import { ZERO } from '$lib/constants/app.constants';
import type { Network } from '$lib/types/network';
import {
	XRP_ACCOUNT_FLAG_DISALLOW_INCOMING_TRUST_LINE,
	XRP_DEFAULT_FEE_DROPS,
	XRP_MAX_FEE_DROPS
} from '$xrp/constants/xrp.constants';
import {
	loadXrpAccountInfo,
	loadXrpOpenLedgerFee,
	XrpAccountNotFoundError
} from '$xrp/rest/xrpl.rest';
import type { XrpAddress } from '$xrp/types/address';
import type { XrpBalance } from '$xrp/types/xrp-balance';
import type { XrpTrustLine } from '$xrp/types/xrp-trust-line';
import type {
	RequiredXrpTrustLineToken,
	XrpIssuerPower,
	XrpTrustLineCustomToken
} from '$xrp/types/xrp-trust-line-token';
import { mapNetworkIdToNetwork } from '$xrp/utils/network.utils';
import { isXrpAddress } from '$xrp/utils/xrp-address.utils';
import { getXrpReserveDrops } from '$xrp/utils/xrp-send.utils';
import {
	LISTED_XRP_TRUST_LINE_TOKENS,
	toXrpTrustLineToken
} from '$xrp/utils/xrp-trust-line-tokens.utils';
import {
	parseXrpCurrencyCode,
	xrpIssuerPowers,
	xrpTrustLineIdentifier
} from '$xrp/utils/xrp-trust-line.utils';
import { isNullish } from '@dfinity/utils';
import type { Nullish } from '@dfinity/zod-schemas';

// The ledger waives the reserve of a new trust line while the account owns fewer objects than this
// (rippled `TrustSet.cpp`), so only from here on can a missing reserve fail the `TrustSet`.
const XRP_TRUST_LINE_RESERVE_WAIVER_OWNER_COUNT = 2;

export type XrpAddTokenRefusal =
	| 'invalid_currency_code'
	| 'invalid_issuer'
	| 'issuer_is_own_address'
	| 'already_added'
	| 'issuer_not_found'
	| 'issuer_disallows_trust_lines'
	| 'account_not_found'
	| 'insufficient_fee'
	| 'insufficient_reserve'
	| 'state_unavailable';

export interface XrpAddTokenReview {
	token: XrpTrustLineCustomToken;
	powers: XrpIssuerPower[];
	fee: XrpBalance;
	// What the account must keep once the line exists, which the ledger waives only at creation.
	reserveAfter: XrpBalance;
	// A listed token with the same currency code from another issuer: the one the user may mean.
	lookalike?: RequiredXrpTrustLineToken;
}

export type XrpAddTokenReviewResult =
	| { review: XrpAddTokenReview; refusal?: never; reserve?: never }
	// `reserve`: for `insufficient_reserve`, the reserve the balance does not cover.
	| { refusal: XrpAddTokenRefusal; reserve?: XrpBalance; review?: never };

const refuse = (refusal: XrpAddTokenRefusal): XrpAddTokenReviewResult => ({ refusal });

/**
 * Everything the review of a token to add states, or why the token cannot be added: each case the
 * ledger would answer by failing the `TrustSet` and keeping its fee is refused before, with its own
 * reason. A ledger that cannot be read refuses too — the same fail-closed answer as the XRP send.
 */
export const loadXrpAddTokenReview = async ({
	currency: currencyInput,
	issuer: issuerInput,
	address,
	lines,
	network
}: {
	currency: string;
	issuer: string;
	// The user's XRP address on this network.
	address: Nullish<XrpAddress>;
	// The account's trust lines, `undefined` until the wallet has read them.
	lines: XrpTrustLine[] | undefined;
	network: Network;
}): Promise<XrpAddTokenReviewResult> => {
	const currency = parseXrpCurrencyCode(currencyInput);

	if (isNullish(currency)) {
		return refuse('invalid_currency_code');
	}

	const issuer = issuerInput.trim();

	if (!isXrpAddress(issuer)) {
		return refuse('invalid_issuer');
	}

	const xrpNetwork = mapNetworkIdToNetwork(network.id);

	if (isNullish(address) || isNullish(xrpNetwork)) {
		return refuse('state_unavailable');
	}

	if (issuer === address) {
		return refuse('issuer_is_own_address');
	}

	if (isNullish(lines)) {
		return refuse('state_unavailable');
	}

	const identifier = xrpTrustLineIdentifier({ currency, issuer });

	if (lines.some((line) => xrpTrustLineIdentifier(line) === identifier)) {
		return refuse('already_added');
	}

	const [issuerInfo, accountInfo, feeQuote] = await Promise.allSettled([
		loadXrpAccountInfo({ address: issuer, network: xrpNetwork, ledgerIndex: 'validated' }),
		loadXrpAccountInfo({ address, network: xrpNetwork, ledgerIndex: 'validated' }),
		loadXrpOpenLedgerFee({ network: xrpNetwork, fallbackFee: XRP_DEFAULT_FEE_DROPS })
	]);

	if (issuerInfo.status === 'rejected') {
		return refuse(
			issuerInfo.reason instanceof XrpAccountNotFoundError
				? 'issuer_not_found'
				: 'state_unavailable'
		);
	}

	if ((issuerInfo.value.flags & XRP_ACCOUNT_FLAG_DISALLOW_INCOMING_TRUST_LINE) !== 0) {
		return refuse('issuer_disallows_trust_lines');
	}

	if (accountInfo.status === 'rejected') {
		return refuse(
			accountInfo.reason instanceof XrpAccountNotFoundError
				? 'account_not_found'
				: 'state_unavailable'
		);
	}

	// Bounded as the XRP send bounds it: a quote it would refuse to sign is no quote.
	if (
		feeQuote.status === 'rejected' ||
		feeQuote.value <= ZERO ||
		feeQuote.value > XRP_MAX_FEE_DROPS
	) {
		return refuse('state_unavailable');
	}

	const { value: fee } = feeQuote;
	const { balance, ownerCount } = accountInfo.value;

	if (balance < fee) {
		return refuse('insufficient_fee');
	}

	const reserveAfter = getXrpReserveDrops({ ownerCount: ownerCount + 1 });

	// Against the balance before the fee, as rippled checks it.
	if (ownerCount >= XRP_TRUST_LINE_RESERVE_WAIVER_OWNER_COUNT && balance < reserveAfter) {
		return { refusal: 'insufficient_reserve', reserve: reserveAfter };
	}

	const lookalike = LISTED_XRP_TRUST_LINE_TOKENS.find(
		(listed) =>
			listed.network.id === network.id && listed.currency === currency && listed.issuer !== issuer
	);

	return {
		review: {
			token: toXrpTrustLineToken({ identity: { currency, issuer }, network }),
			powers: xrpIssuerPowers(issuerInfo.value),
			fee,
			reserveAfter,
			...(isNullish(lookalike) ? {} : { lookalike })
		}
	};
};
