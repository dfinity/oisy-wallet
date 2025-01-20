import { signTransaction } from '$sol/services/sol-sign.services';
import { mockSolSignature } from '$tests/mocks/sol-signatures.mock';
import {
	mockSolSignedTransaction,
	mockSolTransactionMessage
} from '$tests/mocks/sol-transactions.mock';
import * as solanaSignersPkg from '@solana/signers';
import * as solanaTransactionsPkg from '@solana/transactions';
import type { MockInstance } from 'vitest';

vi.mock('@solana/signers', () => ({
	signTransactionMessageWithSigners: vi.fn()
}));

vi.mock('@solana/transactions', () => ({
	getSignatureFromTransaction: vi.fn()
}));

describe('sol-sign.services', () => {
	describe('signTransaction', () => {
		let spySignTransactionMessageWithSigners: MockInstance;
		let spyGetSignatureFromTransaction: MockInstance;

		const mockSignature = mockSolSignature();
		const mockTransactionMessage = mockSolTransactionMessage;
		const mockSignedTransaction = mockSolSignedTransaction;

		beforeEach(() => {
			vi.clearAllMocks();

			spySignTransactionMessageWithSigners = vi
				.spyOn(solanaSignersPkg, 'signTransactionMessageWithSigners')
				.mockResolvedValue(mockSignedTransaction);
			spyGetSignatureFromTransaction = vi
				.spyOn(solanaTransactionsPkg, 'getSignatureFromTransaction')
				.mockReturnValue(mockSignature);
		});

		it('should return a signed transaction and signature', async () => {
			const result = await signTransaction(mockTransactionMessage);

			expect(spySignTransactionMessageWithSigners).toHaveBeenCalledWith(mockTransactionMessage);
			expect(spyGetSignatureFromTransaction).toHaveBeenCalledWith(mockSignedTransaction);
			expect(result).toEqual({
				signedTransaction: mockSignedTransaction,
				signature: mockSignature
			});
		});
	});
});
