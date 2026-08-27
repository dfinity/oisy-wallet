import type { MyTip } from '$declarations/backend/backend.did';
import {
	TIP_HISTORY_GROUP_ORDER,
	isTipCancellable,
	tipHistoryGroup,
	tipStatusKey,
	tipStatusTextClass
} from '$lib/utils/tip-status.utils';
import { Principal } from '@icp-sdk/core/principal';

describe('tip-status.utils', () => {
	const tip = (status: MyTip['status']): MyTip => ({
		tip_id: 'the-id',
		ledger_canister_id: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai'),
		amount: 500_000n,
		expires_at_ns: 1_800_000_000_000_000_000n,
		created_at_ns: 1_700_000_000_000_000_000n,
		status,
		message: [],
		claimed_by: []
	});

	describe('tipStatusKey', () => {
		it('flattens the new Failed variant', () => {
			expect(tipStatusKey({ Failed: null })).toBe('failed');
		});

		it('flattens each candid variant', () => {
			expect(tipStatusKey({ Reserved: null })).toBe('reserved');
			expect(tipStatusKey({ Claimed: null })).toBe('claimed');
			expect(tipStatusKey({ Expired: null })).toBe('expired');
			expect(tipStatusKey({ Cancelled: null })).toBe('cancelled');
		});
	});

	describe('isTipCancellable', () => {
		it('allows cancelling only a live reservation', () => {
			expect(isTipCancellable(tip({ Reserved: null }))).toBeTruthy();
		});

		it('refuses everything already finished', () => {
			// An expired tip has already lapsed on the ledger, so there is nothing
			// left to revoke — offering Cancel would promise an action that does
			// nothing.
			expect(isTipCancellable(tip({ Expired: null }))).toBeFalsy();
			expect(isTipCancellable(tip({ Claimed: null }))).toBeFalsy();
			expect(isTipCancellable(tip({ Cancelled: null }))).toBeFalsy();
		});

		it('still lets the sender cancel a tip whose claim failed', () => {
			// A failed tip is live: its allowance is still granted and its code still
			// works, so cancelling is precisely the alternative to topping up.
			expect(isTipCancellable(tip({ Failed: null }))).toBeTruthy();
		});
	});

	describe('tipStatusTextClass', () => {
		it('highlights only the row the sender can still act on', () => {
			// Inverted from a transaction list on purpose: the green does not mean
			// "this succeeded", it means "still open, still yours to cancel".
			expect(tipStatusTextClass('reserved')).toBe('text-success-primary');
		});

		it('warns on a tip somebody could not claim', () => {
			// The only status that is both live and wrong, so the only one that should
			// pull the eye.
			expect(tipStatusTextClass('failed')).toBe('text-warning-primary');
		});

		it('lets every finished tip recede', () => {
			// Nothing went wrong in any of these and no money is at stake any more, so
			// none of them earns a colour.
			expect(tipStatusTextClass('claimed')).toBe('text-tertiary');
			expect(tipStatusTextClass('expired')).toBe('text-tertiary');
			expect(tipStatusTextClass('cancelled')).toBe('text-tertiary');
		});
	});

	describe('tipHistoryGroup', () => {
		it('sorts each status into one of the four groups', () => {
			expect(tipHistoryGroup('failed')).toBe('failed');
			expect(tipHistoryGroup('reserved')).toBe('open');
			expect(tipHistoryGroup('claimed')).toBe('claimed');
			expect(tipHistoryGroup('expired')).toBe('expired');
		});

		it('files a cancellation with the expired tips', () => {
			// Four groups, not five: the group answers "is there anything to do here",
			// and a revoked tip and a lapsed one both answer no. The row keeps saying
			// which one it actually is.
			expect(tipHistoryGroup('cancelled')).toBe('expired');
		});

		it('puts the actionable group first', () => {
			// A failed tip is the only kind the sender can fix, so it must not sit
			// below rows that need nothing.
			expect(TIP_HISTORY_GROUP_ORDER[0]).toBe('failed');
			expect(TIP_HISTORY_GROUP_ORDER).toEqual(['failed', 'open', 'claimed', 'expired']);
		});
	});
});
