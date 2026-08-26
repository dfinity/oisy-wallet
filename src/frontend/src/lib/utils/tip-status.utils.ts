import type { MyTip, TipStatus } from '$declarations/backend/backend.did';

/** The four statuses the canister stores, as a discriminant a component can switch on. */
export type TipStatusKey = 'reserved' | 'claimed' | 'expired' | 'cancelled';

/**
 * `TipStatus` arrives as a candid variant — `{ Reserved: null }` — which is
 * awkward to switch on in a template. This flattens it.
 *
 * Note what is absent: `Uncovered`. It is not a stored status but the outcome of
 * a claim attempt against an allowance the sender has since spent or revoked, so
 * History cannot show it without querying every tip's allowance on every read.
 * A tip in that condition reads `Reserved` here, which is what the record says.
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
	return 'reserved';
};

/**
 * Colour for the status word in a History row.
 *
 * Only a live reservation is highlighted, which reads the opposite way round
 * from a transaction list: the green is not "this succeeded" but "this is still
 * open, and still yours to cancel". Everything else has finished and is history,
 * so it recedes.
 */
export const tipStatusTextClass = (status: TipStatusKey): string =>
	status === 'reserved' ? 'text-success-primary' : 'text-tertiary';

/**
 * Whether the sender can still cancel. Only a live reservation can be — an
 * expired one has already lapsed on the ledger and there is nothing left to
 * revoke.
 */
export const isTipCancellable = (tip: MyTip): boolean => tipStatusKey(tip.status) === 'reserved';
