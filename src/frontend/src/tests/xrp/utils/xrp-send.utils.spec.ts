import { ZERO } from '$lib/constants/app.constants';
import {
	getXrpMaxAmount,
	getXrpReserveDrops,
	isInvalidDestinationXrp
} from '$xrp/utils/xrp-send.utils';

// Expected values are literals, not the constants or arithmetic these functions use. Restating the
// implementation's own expression makes a test immune to the mistake it exists to catch: a wrong
// reserve constant, or a changed operator, alters both sides equally and the test still passes.
// These numbers come from the network's published reserve — 1 XRP base, 0.2 XRP per owned object.
describe('xrp-send.utils', () => {
	describe('getXrpReserveDrops', () => {
		it('is the base reserve for an account owning nothing', () => {
			expect(getXrpReserveDrops({ ownerCount: 0 })).toBe(1_000_000n);
		});

		// An account holding ledger objects must retain more than the base reserve.
		it.each([
			{ ownerCount: 1, expected: 1_200_000n },
			{ ownerCount: 3, expected: 1_600_000n },
			{ ownerCount: 17, expected: 4_400_000n }
		])('adds the owner reserve per owned object ($ownerCount)', ({ ownerCount, expected }) => {
			expect(getXrpReserveDrops({ ownerCount })).toBe(expected);
		});
	});

	describe('getXrpMaxAmount', () => {
		it('subtracts the fee and the base reserve from the balance', () => {
			expect(getXrpMaxAmount({ balance: 5_000_000n, fee: 10n, ownerCount: 0 })).toBe(3_999_990n);
		});

		// Spending down to the base reserve would leave an owning account short and the
		// transaction would fail on submit.
		it('also subtracts the owner reserve for owned objects', () => {
			expect(getXrpMaxAmount({ balance: 5_000_000n, fee: 10n, ownerCount: 2 })).toBe(3_599_990n);
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
