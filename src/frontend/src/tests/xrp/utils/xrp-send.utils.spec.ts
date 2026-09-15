import { ZERO } from '$lib/constants/app.constants';
import { XRP_BASE_RESERVE_DROPS, XRP_OWNER_RESERVE_DROPS } from '$xrp/constants/xrp.constants';
import {
	getXrpMaxAmount,
	getXrpReserveDrops,
	isInvalidDestinationXrp
} from '$xrp/utils/xrp-send.utils';

describe('xrp-send.utils', () => {
	describe('getXrpReserveDrops', () => {
		it('is the base reserve for an account owning nothing', () => {
			expect(getXrpReserveDrops({ ownerCount: 0 })).toBe(XRP_BASE_RESERVE_DROPS);
		});

		// An account holding ledger objects must retain more than the base reserve.
		it.each([1, 3, 17])('adds the owner reserve per owned object (%i)', (ownerCount) => {
			expect(getXrpReserveDrops({ ownerCount })).toBe(
				XRP_BASE_RESERVE_DROPS + BigInt(ownerCount) * XRP_OWNER_RESERVE_DROPS
			);
		});
	});

	describe('getXrpMaxAmount', () => {
		it('subtracts the fee and the base reserve from the balance', () => {
			expect(getXrpMaxAmount({ balance: 5_000_000n, fee: 10n, ownerCount: 0 })).toBe(
				5_000_000n - 10n - XRP_BASE_RESERVE_DROPS
			);
		});

		// Spending down to the base reserve would leave an owning account short and the
		// transaction would fail on submit.
		it('also subtracts the owner reserve for owned objects', () => {
			expect(getXrpMaxAmount({ balance: 5_000_000n, fee: 10n, ownerCount: 2 })).toBe(
				5_000_000n - 10n - XRP_BASE_RESERVE_DROPS - 2n * XRP_OWNER_RESERVE_DROPS
			);
		});

		it('clamps to zero when the balance cannot cover fee + reserve', () => {
			expect(getXrpMaxAmount({ balance: 500_000n, fee: 10n, ownerCount: 0 })).toBe(ZERO);
		});

		it('clamps to zero when the owner reserve alone exceeds the balance', () => {
			expect(getXrpMaxAmount({ balance: 1_500_000n, fee: 10n, ownerCount: 5 })).toBe(ZERO);
		});
	});

	describe('isInvalidDestinationXrp', () => {
		it('is false for a valid classic address', () => {
			expect(isInvalidDestinationXrp('rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD')).toBeFalsy();
		});

		it('is true for a malformed or nullish destination', () => {
			expect(isInvalidDestinationXrp('not-an-address')).toBeTruthy();
			expect(isInvalidDestinationXrp(undefined)).toBeTruthy();
		});
	});
});
