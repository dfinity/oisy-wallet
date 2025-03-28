import { signTransaction } from '$sol/services/sol-sign.services';
import { mockSolSignature } from '$tests/mocks/sol-signatures.mock';
import {
	mockSolSignedTransaction,
	mockSolTransactionMessage
} from '$tests/mocks/sol-transactions.mock';
import * as solanaWeb3Pkg from '@solana/kit';
import type { MockInstance } from 'vitest';

vi.mock(import('@solana/kit'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		getSignatureFromTransaction: vi.fn(),
		signTransactionMessageWithSigners: vi.fn()
	};
});

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
				.spyOn(solanaWeb3Pkg, 'signTransactionMessageWithSigners')
				.mockResolvedValue(mockSignedTransaction);
			spyGetSignatureFromTransaction = vi
				.spyOn(solanaWeb3Pkg, 'getSignatureFromTransaction')
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
