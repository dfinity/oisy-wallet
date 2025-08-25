import { ZERO } from '$lib/constants/app.constants';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import { checkAllBalancesZero, checkAnyNonZeroBalance } from '$lib/utils/balances.utils';
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

describe('checkAllBalancesZero', () => {
	it('should return false if there is at least one non-zero balance', () => {
		const mockBalancesStore: CertifiedStoreData<BalancesData> = {
			[Symbol('token1')]: { data: bn1 },
			[Symbol('token2')]: { data: ZERO }
		} as unknown as CertifiedStoreData<BalancesData>;

		expect(checkAllBalancesZero({ $balancesStore: mockBalancesStore, minLength: 1 })).toBe(false);
	});

	it('should return false if there is at least one non-zero balance and one nullish balance', () => {
		const mockBalancesStore = {
			[Symbol('token1')]: { data: bn1 },
			[Symbol('token2')]: undefined
		} as unknown as CertifiedStoreData<BalancesData>;

		expect(checkAllBalancesZero({ $balancesStore: mockBalancesStore, minLength: 1 })).toBe(false);
	});

	it('should return false if there is at least one zero balance and one undefined balance', () => {
		const mockBalancesStore = {
			[Symbol('token1')]: { data: ZERO },
			[Symbol('token2')]: undefined
		} as unknown as CertifiedStoreData<BalancesData>;

		expect(checkAllBalancesZero({ $balancesStore: mockBalancesStore, minLength: 1 })).toBe(false);
	});

	it('should return true if there is at least one zero balance and one null balance', () => {
		const mockBalancesStore = {
			[Symbol('token1')]: { data: ZERO },
			[Symbol('token2')]: null
		} as unknown as CertifiedStoreData<BalancesData>;

		expect(checkAllBalancesZero({ $balancesStore: mockBalancesStore, minLength: 1 })).toBe(true);
	});

	it('should return true if all balances are zero', () => {
		const mockBalancesStore = {
			[Symbol('token1')]: { data: ZERO },
			[Symbol('token2')]: { data: ZERO }
		} as unknown as CertifiedStoreData<BalancesData>;

		expect(checkAllBalancesZero({ $balancesStore: mockBalancesStore, minLength: 1 })).toBe(true);
	});

	it('should return false if balances data are nullish', () => {
		const mockBalancesStore = {
			[Symbol('token1')]: { data: null },
			[Symbol('token2')]: { data: undefined }
		} as unknown as CertifiedStoreData<BalancesData>;

		expect(checkAllBalancesZero({ $balancesStore: mockBalancesStore, minLength: 1 })).toBe(false);
	});

	it('should return false if balances are nullish', () => {
		const mockBalancesStore = {
			[Symbol('token1')]: null,
			[Symbol('token2')]: undefined
		} as unknown as CertifiedStoreData<BalancesData>;

		expect(checkAllBalancesZero({ $balancesStore: mockBalancesStore, minLength: 1 })).toBe(false);
	});

	it('should return false if store is empty and minimum length is 0', () => {
		expect(checkAllBalancesZero({ $balancesStore: {}, minLength: 0 })).toBe(false);
	});

	it('should return false if store is empty and minimum length is 1', () => {
		expect(checkAllBalancesZero({ $balancesStore: {}, minLength: 1 })).toBe(false);
	});

	it('should return false if minimum length is not met', () => {
		const mockBalancesStore = {
			[Symbol('token1')]: { data: ZERO },
			[Symbol('token2')]: { data: ZERO }
		} as unknown as CertifiedStoreData<BalancesData>;

		expect(checkAllBalancesZero({ $balancesStore: mockBalancesStore, minLength: 3 })).toBe(false);
	});

	it('should return true if minimum length is met', () => {
		const mockBalancesStore = {
			[Symbol('token1')]: { data: ZERO },
			[Symbol('token2')]: { data: ZERO },
			[Symbol('token3')]: { data: ZERO }
		} as unknown as CertifiedStoreData<BalancesData>;

		expect(checkAllBalancesZero({ $balancesStore: mockBalancesStore, minLength: 3 })).toBe(true);
	});
});
