import type { MyTip } from '$declarations/backend/backend.did';
import { isTipCancellable, tipStatusKey, tipStatusTextClass } from '$lib/utils/tip-status.utils';
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
	});

	describe('tipStatusTextClass', () => {
		it('highlights only the row the sender can still act on', () => {
			// Inverted from a transaction list on purpose: the green does not mean
			// "this succeeded", it means "still open, still yours to cancel".
			expect(tipStatusTextClass('reserved')).toBe('text-success-primary');
		});

		it('lets every finished tip recede', () => {
			// Nothing went wrong in any of these and no money is at stake any more, so
			// none of them earns a colour.
			expect(tipStatusTextClass('claimed')).toBe('text-tertiary');
			expect(tipStatusTextClass('expired')).toBe('text-tertiary');
			expect(tipStatusTextClass('cancelled')).toBe('text-tertiary');
		});
	});
});
