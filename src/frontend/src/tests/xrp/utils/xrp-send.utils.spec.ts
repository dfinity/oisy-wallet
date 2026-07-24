import { ZERO } from '$lib/constants/app.constants';
import { XRP_BASE_RESERVE_DROPS } from '$xrp/constants/xrp.constants';
import { getXrpMaxAmount, isInvalidDestinationXrp } from '$xrp/utils/xrp-send.utils';

describe('xrp-send.utils', () => {
	describe('getXrpMaxAmount', () => {
		it('subtracts the fee and the base reserve from the balance', () => {
			expect(getXrpMaxAmount({ balance: 5_000_000n, fee: 10n })).toBe(
				5_000_000n - 10n - XRP_BASE_RESERVE_DROPS
			);
		});

		it('clamps to zero when the balance cannot cover fee + reserve', () => {
			expect(getXrpMaxAmount({ balance: 500_000n, fee: 10n })).toBe(ZERO);
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
