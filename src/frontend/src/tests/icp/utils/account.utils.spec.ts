import { invalidIcpAddress, isIcpAccountIdentifier } from '$icp/utils/account.utils';
import { checkAccountId } from '@icp-sdk/canisters/ledger/icp';

vi.mock('@icp-sdk/canisters/ledger/icp', () => ({
	checkAccountId: vi.fn()
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

			expect(mockCheckAccountId).toHaveBeenCalledExactlyOnceWith('aaaaa-aa');
		});

		it('should return false if checkAccountId throws', () => {
			mockCheckAccountId.mockImplementationOnce(() => {
				throw new Error();
			});

			expect(isIcpAccountIdentifier('aaaaa-aa')).toBeFalsy();

			expect(mockCheckAccountId).toHaveBeenCalledExactlyOnceWith('aaaaa-aa');
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

			expect(mockCheckAccountId).toHaveBeenCalledExactlyOnceWith('aaaaa-aa');
		});

		it('should return true if checkAccountId throws', () => {
			mockCheckAccountId.mockImplementationOnce(() => {
				throw new Error();
			});

			expect(invalidIcpAddress('aaaaa-aa')).toBeTruthy();

			expect(mockCheckAccountId).toHaveBeenCalledExactlyOnceWith('aaaaa-aa');
		});
	});
});
