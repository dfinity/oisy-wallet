import { ZERO } from '$lib/constants/app.constants';
import type { NullishIdentity } from '$lib/types/identity';
import { XRP_DEFAULT_FEE_DROPS, XRP_MAX_FEE_DROPS } from '$xrp/constants/xrp.constants';
import { loadXrpAccountInfo, loadXrpAccountLines, loadXrpOpenLedgerFee } from '$xrp/rest/xrpl.rest';
import { assertNoXrpPaymentInFlight } from '$xrp/services/xrp-in-flight.services';
import type { XrpAddress } from '$xrp/types/address';
import type { XrpBalance } from '$xrp/types/xrp-balance';
import { XrpSendAlreadyInFlightError } from '$xrp/types/xrp-send';
import type { XrpTrustLineCustomToken } from '$xrp/types/xrp-trust-line-token';
import { mapNetworkIdToNetwork } from '$xrp/utils/network.utils';
import { isXrpTokenValueZero, xrpTrustLineIdentifier } from '$xrp/utils/xrp-trust-line.utils';
import { isNullish } from '@dfinity/utils';
import type { Nullish } from '@dfinity/zod-schemas';

export type XrpRemoveTokenRefusal =
	| 'transaction_in_flight'
	| 'not_guarded'
	| 'not_held'
	| 'balance_not_zero'
	| 'insufficient_fee'
	| 'state_unavailable';

export interface XrpRemoveTokenReview {
	fee: XrpBalance;
}

export type XrpRemoveTokenReviewResult =
	| { review: XrpRemoveTokenReview; refusal?: never }
	| { refusal: XrpRemoveTokenRefusal; review?: never };

const refuse = (refusal: XrpRemoveTokenRefusal): XrpRemoveTokenReviewResult => ({ refusal });

/**
 * What the confirmation of removing a token states — the network fee — or why the token cannot be
 * removed now. A line the account no longer holds would fail the `TrustSet` as redundant, and a
 * balance that is not exactly zero would keep the line with the account unable to receive the
 * token, so both are refused before, as are the fee and the in-flight guard the `TrustSet` itself
 * passes. A ledger that cannot be read refuses too.
 */
export const loadXrpRemoveTokenReview = async ({
	identity,
	token,
	address
}: {
	identity: NullishIdentity;
	token: XrpTrustLineCustomToken;
	// The user's XRP address on the token's network.
	address: Nullish<XrpAddress>;
}): Promise<XrpRemoveTokenReviewResult> => {
	const network = mapNetworkIdToNetwork(token.network.id);

	if (isNullish(address) || isNullish(network)) {
		return refuse('state_unavailable');
	}

	const [lines, accountInfo, feeQuote, noneInFlight] = await Promise.allSettled([
		loadXrpAccountLines({ address, network, peer: token.issuer }),
		loadXrpAccountInfo({ address, network, ledgerIndex: 'validated' }),
		loadXrpOpenLedgerFee({ network, fallbackFee: XRP_DEFAULT_FEE_DROPS }),
		assertNoXrpPaymentInFlight({ identity, source: address })
	]);

	if (lines.status === 'rejected') {
		return refuse('state_unavailable');
	}

	const identifier = xrpTrustLineIdentifier(token);
	const line = lines.value.find((held) => xrpTrustLineIdentifier(held) === identifier);

	if (isNullish(line)) {
		return refuse('not_held');
	}

	if (!isXrpTokenValueZero(line.balance)) {
		return refuse('balance_not_zero');
	}

	// Bounded as the XRP send bounds it: a quote it would refuse to sign is no quote.
	if (
		accountInfo.status === 'rejected' ||
		feeQuote.status === 'rejected' ||
		feeQuote.value <= ZERO ||
		feeQuote.value > XRP_MAX_FEE_DROPS
	) {
		return refuse('state_unavailable');
	}

	const { value: fee } = feeQuote;

	// The fee only: removing releases a reserve rather than adding one.
	if (accountInfo.value.balance < fee) {
		return refuse('insufficient_fee');
	}

	if (noneInFlight.status === 'rejected') {
		return refuse(
			noneInFlight.reason instanceof XrpSendAlreadyInFlightError
				? 'transaction_in_flight'
				: 'not_guarded'
		);
	}

	return { review: { fee } };
};
