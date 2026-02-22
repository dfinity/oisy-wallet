import { isEthAddress } from '$eth/utils/account.utils';
import * as ethersAddress from 'ethers/address';

vi.mock('ethers/address', () => ({
	isAddress: vi.fn()
}));

describe('account.utils', () => {
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

			expect(mockIsAddress).toHaveBeenCalledExactlyOnceWith('0xaaaaa');
		});

		it('should return false if isAddress returns false', () => {
			mockIsAddress.mockImplementationOnce(() => false);

			expect(isEthAddress('0xaaaaa')).toBeFalsy();

			expect(mockIsAddress).toHaveBeenCalledExactlyOnceWith('0xaaaaa');
		});
	});
});
