import { ZERO } from '$lib/constants/app.constants';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import { checkAnyNonZeroBalance } from '$lib/utils/balances.utils';
import { bn1 } from '$tests/mocks/balances.mock';

describe('checkAnyNonZeroBalance', () => {
	it('should return true if there is at least one non-zero balance', () => {
		const mockBalancesStore: CertifiedStoreData<BalancesData> = {
			[Symbol('token1')]: { data: bn1 },
			[Symbol('token2')]: { data: ZERO }
		} as unknown as CertifiedStoreData<BalancesData>;

		expect(checkAnyNonZeroBalance(mockBalancesStore)).toBe(true);
	});

	it('should return true if there is at least one non-zero balance and one nullish balance', () => {
		const mockBalancesStore = {
			[Symbol('token1')]: { data: bn1 },
			[Symbol('token2')]: undefined
		} as unknown as CertifiedStoreData<BalancesData>;

		expect(checkAnyNonZeroBalance(mockBalancesStore)).toBe(true);
	});

	it('should return false if all balances are zero', () => {
		const mockBalancesStore = {
			[Symbol('token1')]: { data: ZERO },
			[Symbol('token2')]: { data: ZERO }
		} as unknown as CertifiedStoreData<BalancesData>;

		expect(checkAnyNonZeroBalance(mockBalancesStore)).toBe(false);
	});

	it('should return false if balances data are nullish', () => {
		const mockBalancesStore = {
			[Symbol('token1')]: { data: null },
			[Symbol('token2')]: { data: undefined }
		} as unknown as CertifiedStoreData<BalancesData>;

		expect(checkAnyNonZeroBalance(mockBalancesStore)).toBe(false);
	});

	it('should return false if balances are nullish', () => {
		const mockBalancesStore = {
			[Symbol('token1')]: null,
			[Symbol('token2')]: undefined
		} as unknown as CertifiedStoreData<BalancesData>;

		expect(checkAnyNonZeroBalance(mockBalancesStore)).toBe(false);
	});

	it('should return false if store is empty', () => {
		expect(checkAnyNonZeroBalance({} as unknown as CertifiedStoreData<BalancesData>)).toBe(false);
	});

	it('should return false if store is not initialized', () => {
		expect(checkAnyNonZeroBalance(undefined)).toBe(false);
	});
});
