import { ZERO } from '$lib/constants/app.constants';
import {
	getXrpMaxAmount,
	getXrpReserveDrops,
	isInvalidDestinationXrp,
	isXrpAmountSendable
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

	// The form validates against the fee and reserve as they were when the amount was typed, and
	// `TokenInputContent` revalidates on amount/token change only — so the fee poller can raise the
	// requirement underneath an accepted amount. This is the guard re-applied at send time.
	describe('isXrpAmountSendable', () => {
		const balance = 5_000_000n;
		const reserve = getXrpReserveDrops({ ownerCount: 0 });

		it('accepts an amount that leaves the fee and the reserve', () => {
			expect(
				isXrpAmountSendable({ amount: balance - 10n - reserve, balance, fee: 10n, reserve })
			).toBeTruthy();
		});

		it('refuses an amount one drop above the sendable maximum', () => {
			expect(
				isXrpAmountSendable({ amount: balance - 10n - reserve + 1n, balance, fee: 10n, reserve })
			).toBeFalsy();
		});

		// The reported case: valid when typed at the base fee, invalid after escalation.
		it('refuses an amount that was valid before the fee grew', () => {
			const amount = balance - 10n - reserve;

			expect(isXrpAmountSendable({ amount, balance, fee: 10n, reserve })).toBeTruthy();
			expect(isXrpAmountSendable({ amount, balance, fee: 5_000n, reserve })).toBeFalsy();
		});

		it('refuses an amount that was valid before the reserve grew', () => {
			const amount = balance - 10n - reserve;

			expect(isXrpAmountSendable({ amount, balance, fee: 10n, reserve })).toBeTruthy();
			expect(
				isXrpAmountSendable({
					amount,
					balance,
					fee: 10n,
					reserve: getXrpReserveDrops({ ownerCount: 3 })
				})
			).toBeFalsy();
		});

		it('refuses any positive amount when the reserve already exceeds the balance', () => {
			expect(isXrpAmountSendable({ amount: 1n, balance: reserve, fee: 10n, reserve })).toBeFalsy();
		});
	});
});
