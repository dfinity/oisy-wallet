import type { MyTip, TipStatus } from '$declarations/backend/backend.did';

/** The five statuses the canister stores, as a discriminant a component can switch on. */
export type TipStatusKey = 'reserved' | 'failed' | 'claimed' | 'expired' | 'cancelled';

/**
 * How History groups rows. Fewer groups than statuses on purpose: what the reader
 * needs is "does this want something from me", and a cancelled tip and a lapsed
 * one are equally finished.
 */
export type TipHistoryGroup = 'failed' | 'open' | 'claimed' | 'expired';

/**
 * Failed first, because it is the only group the sender can do anything about —
 * somebody tried to claim and could not, and the code is still valid, so topping
 * up the account makes the tip work. Then what is still live, then what is done.
 */
export const TIP_HISTORY_GROUP_ORDER: TipHistoryGroup[] = ['failed', 'open', 'claimed', 'expired'];

/**
 * `TipStatus` arrives as a candid variant — `{ Reserved: null }` — which is
 * awkward to switch on in a template. This flattens it.
 *
 * Note what is absent: `Uncovered`. It is not a stored status but the outcome of
 * a claim attempt against an allowance the sender has since spent or revoked. A
 * tip in that condition now reads `failed`, because the canister records the
 * attempt — which is what `Failed` was added for.
 */
export const tipStatusKey = (status: TipStatus): TipStatusKey => {
	if ('Claimed' in status) {
		return 'claimed';
	}
	if ('Expired' in status) {
		return 'expired';
	}
	if ('Cancelled' in status) {
		return 'cancelled';
	}
	if ('Failed' in status) {
		return 'failed';
	}
	return 'reserved';
};

/**
 * A cancelled tip is grouped with the expired ones while its row keeps saying
 * "Cancelled": the group answers "is there anything to do here", and the answer
 * for both is no. Splitting them would buy a fourth heading that never needs
 * acting on.
 */
export const tipHistoryGroup = (status: TipStatusKey): TipHistoryGroup => {
	switch (status) {
		case 'failed':
			return 'failed';
		case 'claimed':
			return 'claimed';
		case 'expired':
		case 'cancelled':
			return 'expired';
		case 'reserved':
			return 'open';
	}
};

/**
 * Colour for the status word in a History row.
 *
 * Two statuses stand out, for opposite reasons: a live reservation is green
 * because it is still open and still yours to cancel, and a failed one is a
 * warning because someone tried to take it and could not. Everything else has
 * finished and recedes.
 */
export const tipStatusTextClass = (status: TipStatusKey): string => {
	if (status === 'reserved') {
		return 'text-success-primary';
	}

	if (status === 'failed') {
		return 'text-warning-primary';
	}

	return 'text-tertiary';
};

/**
 * Whether the sender can still cancel.
 *
 * A failed tip counts: it is live, its allowance is still granted and its code
 * still works, so cancelling is exactly the alternative to topping up. Only a
 * finished tip cannot be — an expired one has already lapsed on the ledger and
 * there is nothing left to revoke.
 */
export const isTipCancellable = (tip: MyTip): boolean =>
	['reserved', 'failed'].includes(tipStatusKey(tip.status));
