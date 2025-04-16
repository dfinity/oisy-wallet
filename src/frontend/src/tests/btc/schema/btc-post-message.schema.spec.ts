import { BtcPostMessageDataResponseWalletSchema } from '$btc/schema/btc-post-message.schema';
import type { CertifiedData } from '$lib/types/store';

describe('btc-post-message.schema', () => {
	describe('BtcPostMessageDataResponseWalletSchema', () => {
		const mockValidBalance: CertifiedData<bigint> = {
			data: 1000n,
			certified: true
		};
		const mockValidTransactions = JSON.stringify([{ id: 'tx1', amount: 500 }]);

		it('should validate with a valid balance and newTransactions', () => {
			const validData = {
				wallet: {
					balance: mockValidBalance,
					newTransactions: mockValidTransactions
				}
			};

			expect(BtcPostMessageDataResponseWalletSchema.parse(validData)).toEqual(validData);
		});

		it('should fail if newTransactions is missing', () => {
			const invalidData = {
				wallet: {
					balance: mockValidBalance
				}
			};

			expect(() => BtcPostMessageDataResponseWalletSchema.parse(invalidData)).toThrow();
		});

		it('should validate if balance is not a bigint because of zod custom', () => {
			const validData = {
				wallet: {
					balance: 'not_a_bigint',
					newTransactions: mockValidTransactions
				}
			};

			expect(BtcPostMessageDataResponseWalletSchema.parse(validData)).toEqual(validData);
		});

		it('should validate if newTransactions is not valid JSON because it accepts a string', () => {
			const validData = {
				wallet: {
					balance: mockValidBalance,
					newTransactions: 'invalid_json'
				}
			};

			expect(BtcPostMessageDataResponseWalletSchema.parse(validData)).toEqual(validData);
		});
	});
});
