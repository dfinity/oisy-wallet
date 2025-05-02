import * as accountUtils from '$lib/utils/account.utils';
import { invalidBtcAddress, isBtcAddress, recognizeAddress } from '$lib/utils/address.utils';
import * as solAddressUtils from '$sol/utils/sol-address.utils';

describe('address.utils', () => {
	const VALID_BTC_ADDRESS = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
	const INVALID_BTC_ADDRESS = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlx';

	describe('isBtcAddress', () => {
		it('should return false if address is undefined', () => {
			const result = isBtcAddress(undefined);

			expect(result).toBeFalsy();
		});

		it('should return true for valid BTC addresses', () => {
			const result = isBtcAddress({ address: VALID_BTC_ADDRESS });

			expect(result).toBeTruthy();
		});

		it('should return false for invalid BTC addresses', () => {
			const result = isBtcAddress({ address: INVALID_BTC_ADDRESS });

			expect(result).toBeFalsy();
		});
	});

	describe('invalidBtcAddress', () => {
		it('should return true if address is undefined', () => {
			const result = invalidBtcAddress(undefined);

			expect(result).toBeTruthy();
		});

		it('should return false for valid BTC addresses', () => {
			const result = invalidBtcAddress({ address: VALID_BTC_ADDRESS });

			expect(result).toBeFalsy();
		});

		it('should return true for invalid BTC addresses', () => {
			const result = invalidBtcAddress({ address: INVALID_BTC_ADDRESS });

			expect(result).toBeTruthy();
		});
	});

	describe('recognizeAddress', () => {
		Object.entries({
			[VALID_BTC_ADDRESS]: 'BTC',
			[INVALID_BTC_ADDRESS]: undefined,
			'0x71C7656EC7ab88b098defB751B7401B5f6d8976F': 'ETH',
			'0x71C7656EC7ab88b098defB751B7401B5f6d8976f': undefined, // invalid ETH
			'7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV': 'SOL',
			DpNXPNWvWoHaZ9P3WtfGCb2ZdLihW8VW1w1Ph4KDH9iG: 'SOL',
			dpNXPNWvWoHaZ9P3WtfGCb2ZdLihW8VW1w1Ph4KDH9iG: undefined, // invalid SOL
			'6c04faf793b42b156206f805d13ba1b3b697ec18f519e6a11484eed091859d5a': 'ICP', // ICP Account
			'6c04faf793b42b156206f805d13ba1b3b697ec18f519e6a11484eed091859d5b': undefined, // Invalid ICP Account
			'hyegl-fd3np-exctq-tzmg4-35tfn-6fjv3-tszbf-xefsq-rkaxn-tozyh-mqe': 'ICP', // Principal ID
			'hyegl-fd3np-exctq-tzmg4-35tfn-6fjv3-tszbf-xefsq-rkaxn-tozyh-mqm': undefined, // Invalid Principal ID
			'': undefined
		}).forEach(([address, result]) => {
			it(`should recognize address ${JSON.stringify(address)} as ${JSON.stringify(result)}`, () => {
				expect(recognizeAddress(address)).toBe(result);
			});
		});

		it('should return undefined if address is undefined', () => {
			const result = recognizeAddress(undefined as unknown as string);

			expect(result).toBeUndefined();
		});

		it('should return undefined if address is null', () => {
			const result = recognizeAddress(null as unknown as string);

			expect(result).toBeUndefined();
		});

		it('should throw an error if multiple address types are detected', () => {
			// Mock isEthAddress and isSolAddress to both return true for our test address
			const spyIsEthAddress = vi.spyOn(accountUtils, 'isEthAddress');
			const spyIsSolAddress = vi.spyOn(solAddressUtils, 'isSolAddress');

			try {
				// Set up the mocks to return true for our test address
				spyIsEthAddress.mockImplementation((_) => true);
				spyIsSolAddress.mockImplementation((_) => true);

				// The function should throw an error because multiple address types are detected
				expect(() => recognizeAddress('foo')).toThrow();
				expect(() => recognizeAddress('foo')).toThrow(
					'Detected more than one network type: ["ETH","SOL"]'
				);
			} finally {
				// Restore the original implementations
				spyIsEthAddress.mockRestore();
				spyIsSolAddress.mockRestore();
			}
		});
	});
});
