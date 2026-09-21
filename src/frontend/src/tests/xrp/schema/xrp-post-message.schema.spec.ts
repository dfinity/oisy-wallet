import type { CertifiedData } from '$lib/types/store';
import { XrpPostMessageDataResponseWalletSchema } from '$xrp/schema/xrp-post-message.schema';
import type { XrpBalance } from '$xrp/types/xrp-balance';

describe('xrp-post-message.schema', () => {
	describe('XrpPostMessageDataResponseWalletSchema', () => {
		const mockBalance: CertifiedData<XrpBalance | null> = {
			data: 1_000_000n,
			certified: true
		};

		const mockNewTransactions = JSON.stringify([]);

		it('should validate a wallet response with a certified balance and transactions', () => {
			const validData = {
				wallet: { balance: mockBalance, newTransactions: mockNewTransactions }
			};

			expect(XrpPostMessageDataResponseWalletSchema.parse(validData)).toEqual(validData);
		});

		it('should fail if the wallet field is missing', () => {
			expect(() => XrpPostMessageDataResponseWalletSchema.parse({})).toThrow();
		});

		// Optional by design: absent means the history could not be read this round, which is a
		// different claim from an empty page and must not write the store.
		it('should accept a message that carries no newTransactions', () => {
			const data = { wallet: { balance: mockBalance } };

			expect(() => XrpPostMessageDataResponseWalletSchema.parse(data)).not.toThrow();
		});

		it('should fail on unknown top-level fields because the base schema is strict', () => {
			const invalidData = {
				wallet: { balance: mockBalance, newTransactions: mockNewTransactions },
				unexpected: 'x'
			};

			expect(() => XrpPostMessageDataResponseWalletSchema.parse(invalidData)).toThrow();
		});

		it('should accept a non-balance value because the balance field is a zod custom', () => {
			const data = { wallet: { balance: 'not_a_balance', newTransactions: mockNewTransactions } };

			expect(XrpPostMessageDataResponseWalletSchema.parse(data)).toEqual(data);
		});
	});
});
