import { invalidIcpAddress, isEthAddress, isIcpAccountIdentifier } from '$lib/utils/account.utils';
import { checkAccountId } from '@dfinity/ledger-icp';
import * as ethersAddress from 'ethers/address';

vi.mock('@dfinity/ledger-icp', () => ({
	checkAccountId: vi.fn()
}));

vi.mock('ethers/address', () => ({
	isAddress: vi.fn()
}));

describe('account.utils', () => {
	describe('isIcpAccountIdentifier', () => {
		const mockCheckAccountId = vi.mocked(checkAccountId);

		beforeEach(() => {
			vi.resetAllMocks();

			mockCheckAccountId.mockImplementation(() => {});
		});

		it('should return false if address is undefined', () => {
			expect(isIcpAccountIdentifier(undefined)).toBeFalsy();

			expect(mockCheckAccountId).not.toHaveBeenCalled();
		});

		it('should return true if checkAccountId does not throw', () => {
			expect(isIcpAccountIdentifier('aaaaa-aa')).toBeTruthy();

			expect(mockCheckAccountId).toHaveBeenCalledOnce();
			expect(mockCheckAccountId).toHaveBeenCalledWith('aaaaa-aa');
		});

		it('should return false if checkAccountId throws', () => {
			mockCheckAccountId.mockImplementationOnce(() => {
				throw new Error();
			});

			expect(isIcpAccountIdentifier('aaaaa-aa')).toBeFalsy();

			expect(mockCheckAccountId).toHaveBeenCalledOnce();
			expect(mockCheckAccountId).toHaveBeenCalledWith('aaaaa-aa');
		});
	});

	describe('isEthAddress', () => {
		const mockIsAddress = vi.spyOn(ethersAddress, 'isAddress');

		beforeEach(() => {
			vi.resetAllMocks();

			mockIsAddress.mockImplementation(() => true);
		});

		it('should return false if address is undefined', () => {
			expect(isEthAddress(undefined)).toBeFalsy();

			expect(mockIsAddress).not.toHaveBeenCalled();
		});

		it('should return true if isAddress returns true', () => {
			expect(isEthAddress('0xaaaaa')).toBeTruthy();

			expect(mockIsAddress).toHaveBeenCalledOnce();
			expect(mockIsAddress).toHaveBeenCalledWith('0xaaaaa');
		});

		it('should return false if isAddress returns false', () => {
			mockIsAddress.mockImplementationOnce(() => false);

			expect(isEthAddress('0xaaaaa')).toBeFalsy();

			expect(mockIsAddress).toHaveBeenCalledOnce();
			expect(mockIsAddress).toHaveBeenCalledWith('0xaaaaa');
		});
	});

	describe('invalidIcpAddress', () => {
		const mockCheckAccountId = vi.mocked(checkAccountId);

		beforeEach(() => {
			vi.resetAllMocks();

			mockCheckAccountId.mockImplementation(() => {});
		});

		it('should return true if address is undefined', () => {
			expect(invalidIcpAddress(undefined)).toBeTruthy();

			expect(mockCheckAccountId).not.toHaveBeenCalled();
		});

		it('should return false if checkAccountId does not throw', () => {
			expect(invalidIcpAddress('aaaaa-aa')).toBeFalsy();

			expect(mockCheckAccountId).toHaveBeenCalledOnce();
			expect(mockCheckAccountId).toHaveBeenCalledWith('aaaaa-aa');
		});

		it('should return true if checkAccountId throws', () => {
			mockCheckAccountId.mockImplementationOnce(() => {
				throw new Error();
			});

			expect(invalidIcpAddress('aaaaa-aa')).toBeTruthy();

			expect(mockCheckAccountId).toHaveBeenCalledOnce();
			expect(mockCheckAccountId).toHaveBeenCalledWith('aaaaa-aa');
		});
	});
});
