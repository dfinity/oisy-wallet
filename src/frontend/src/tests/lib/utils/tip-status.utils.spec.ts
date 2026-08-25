import type { MyTip } from '$declarations/backend/backend.did';
import { isTipCancellable, tipStatusKey, tipStatusVariant } from '$lib/utils/tip-status.utils';
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

	describe('tipStatusVariant', () => {
		it('marks a claim as the only success', () => {
			expect(tipStatusVariant('claimed')).toBe('success');
			expect(tipStatusVariant('reserved')).toBe('info');
		});

		it('does not dress a lapsed or cancelled tip as a failure', () => {
			// Nothing went wrong in either case and no money moved, so an error
			// colour would tell the sender something untrue.
			expect(tipStatusVariant('expired')).toBe('disabled');
			expect(tipStatusVariant('cancelled')).toBe('disabled');
		});
	});
});
