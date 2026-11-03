import { SolPostMessageDataResponseWalletSchema } from '$sol/schema/sol-post-message.schema';
import type { SolNetworkBalances } from '$sol/types/sol-balance';
import { mockSplAddress } from '$tests/mocks/sol.mock';

describe('sol-post-message.schema', () => {
	describe('SolPostMessageDataResponseWalletSchema', () => {
		const mockValidBalances: SolNetworkBalances = {
			sol: 1000n,
			spl: { [mockSplAddress]: 5n }
		};
		const mockValidTransactions = JSON.stringify([{ transaction: { id: 'tx1' }, sources: [] }]);

		it('should validate with valid balances and newTransactions', () => {
			const validData = {
				wallet: {
					balances: mockValidBalances,
					newTransactions: mockValidTransactions
				}
			};

			expect(SolPostMessageDataResponseWalletSchema.parse(validData)).toEqual(validData);
		});

		it('should fail if newTransactions is missing', () => {
			const invalidData = {
				wallet: {
					balances: mockValidBalances
				}
			};

			expect(() => SolPostMessageDataResponseWalletSchema.parse(invalidData)).toThrow();
		});

		it('should fail if balances are missing', () => {
			const invalidData = {
				wallet: {
					newTransactions: mockValidTransactions
				}
			};

			expect(() => SolPostMessageDataResponseWalletSchema.parse(invalidData)).toThrow();
		});

		it('should validate if balances are not network balances because of zod custom', () => {
			const validData = {
				wallet: {
					balances: 'not_balances',
					newTransactions: mockValidTransactions
				}
			};

			expect(SolPostMessageDataResponseWalletSchema.parse(validData)).toEqual(validData);
		});

		it('should validate if newTransactions is not valid JSON because it accepts a string', () => {
			const validData = {
				wallet: {
					balances: mockValidBalances,
					newTransactions: 'invalid_json'
				}
			};

			expect(SolPostMessageDataResponseWalletSchema.parse(validData)).toEqual(validData);
		});
	});
});
