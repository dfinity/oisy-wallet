import { invalidIcpAddress, isEthAddress, isIcpAccountIdentifier } from '$lib/utils/account.utils';
import { checkAccountId } from '@dfinity/ledger-icp';
import { isAddress } from '@ethersproject/address';
import type { MockedFunction } from 'vitest';

vi.mock('@dfinity/ledger-icp', () => ({
	checkAccountId: vi.fn()
}));

vi.mock('@ethersproject/address', () => ({
	isAddress: vi.fn()
}));

describe('account.utils', () => {
	describe('isIcpAccountIdentifier', () => {
		const mockCheckAccountId = checkAccountId as MockedFunction<typeof checkAccountId>;

		beforeEach(() => {
			vi.resetAllMocks();

			mockCheckAccountId.mockImplementation(() => {});
		});

		it('should return false if address is undefined', () => {
			expect(isIcpAccountIdentifier(undefined)).toBe(false);

			expect(mockCheckAccountId).not.toHaveBeenCalled();
		});

		it('should return true if checkAccountId does not throw', () => {
			expect(isIcpAccountIdentifier('aaaaa-aa')).toBe(true);

			expect(mockCheckAccountId).toHaveBeenCalledOnce();
			expect(mockCheckAccountId).toHaveBeenCalledWith('aaaaa-aa');
		});

		it('should return false if checkAccountId throws', () => {
			mockCheckAccountId.mockImplementationOnce(() => {
				throw new Error();
			});

			expect(isIcpAccountIdentifier('aaaaa-aa')).toBe(false);

			expect(mockCheckAccountId).toHaveBeenCalledOnce();
			expect(mockCheckAccountId).toHaveBeenCalledWith('aaaaa-aa');
		});
	});

	describe('isEthAddress', () => {
		const mockIsAddress = isAddress as MockedFunction<typeof isAddress>;

		beforeEach(() => {
			vi.resetAllMocks();

			mockIsAddress.mockImplementation(() => true);
		});

		it('should return false if address is undefined', () => {
			expect(isEthAddress(undefined)).toBe(false);

			expect(mockIsAddress).not.toHaveBeenCalled();
		});

		it('should return true if isAddress returns true', () => {
			expect(isEthAddress('0xaaaaa')).toBe(true);

			expect(mockIsAddress).toHaveBeenCalledOnce();
			expect(mockIsAddress).toHaveBeenCalledWith('0xaaaaa');
		});

		it('should return false if isAddress returns false', () => {
			mockIsAddress.mockImplementationOnce(() => false);

			expect(isEthAddress('0xaaaaa')).toBe(false);

			expect(mockIsAddress).toHaveBeenCalledOnce();
			expect(mockIsAddress).toHaveBeenCalledWith('0xaaaaa');
		});
	});

	describe('invalidIcpAddress', () => {
		const mockCheckAccountId = checkAccountId as MockedFunction<typeof checkAccountId>;

		beforeEach(() => {
			vi.resetAllMocks();

			mockCheckAccountId.mockImplementation(() => {});
		});

		it('should return true if address is undefined', () => {
			expect(invalidIcpAddress(undefined)).toBe(true);

			expect(mockCheckAccountId).not.toHaveBeenCalled();
		});

		it('should return false if checkAccountId does not throw', () => {
			expect(invalidIcpAddress('aaaaa-aa')).toBe(false);

			expect(mockCheckAccountId).toHaveBeenCalledOnce();
			expect(mockCheckAccountId).toHaveBeenCalledWith('aaaaa-aa');
		});

		it('should return true if checkAccountId throws', () => {
			mockCheckAccountId.mockImplementationOnce(() => {
				throw new Error();
			});

			expect(invalidIcpAddress('aaaaa-aa')).toBe(true);

			expect(mockCheckAccountId).toHaveBeenCalledOnce();
			expect(mockCheckAccountId).toHaveBeenCalledWith('aaaaa-aa');
		});
	});
});
