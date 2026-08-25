import type { MyTip, TipStatus } from '$declarations/backend/backend.did';
import type { BadgeVariant } from '$lib/types/style';

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

export const tipStatusVariant = (status: TipStatusKey): BadgeVariant => {
	switch (status) {
		case 'claimed':
			return 'success';
		case 'expired':
			return 'disabled';
		case 'cancelled':
			return 'disabled';
		default:
			return 'info';
	}
};

/**
 * Whether the sender can still cancel. Only a live reservation can be — an
 * expired one has already lapsed on the ledger and there is nothing left to
 * revoke.
 */
export const isTipCancellable = (tip: MyTip): boolean => tipStatusKey(tip.status) === 'reserved';
