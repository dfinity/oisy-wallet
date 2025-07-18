import { SOLANA_KEY_ID } from '$env/networks/networks.sol.env';
import * as signerApi from '$lib/api/signer.api';
import { SOLANA_DERIVATION_PATH_PREFIX } from '$sol/constants/sol.constants';
import type { SolanaNetworkType } from '$sol/types/network';
import { createSigner } from '$sol/utils/sol-sign.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import type { Transaction } from '@solana/kit';
import type { MockInstance } from 'vitest';

describe('sol-sign.utils', () => {
	describe('createSigner', () => {
		let spySignWithSchnorr: MockInstance;

		const mockSignedBytes = [4, 5, 6];
		const mockNetwork: SolanaNetworkType = 'mainnet';
		const mockTransaction: Transaction = {
			messageBytes: new Uint8Array([1, 2, 3])
		} as unknown as Transaction;

		beforeEach(() => {
			vi.clearAllMocks();

			spySignWithSchnorr = vi
				.spyOn(signerApi, 'signWithSchnorr')
				.mockResolvedValue(mockSignedBytes);
		});

		it('should return a signer with correct address', () => {
			const signer = createSigner({
				identity: mockIdentity,
				address: mockSolAddress,
				network: mockNetwork
			});

			expect(signer.address).toBe(mockSolAddress);
		});

		it('should call signWithSchnorr with correct parameters for a single transaction', async () => {
			const signer = createSigner({
				identity: mockIdentity,
				address: mockSolAddress,
				network: mockNetwork
			});

			const signature = await signer.signTransactions([mockTransaction]);

			expect(spySignWithSchnorr).toHaveBeenCalledWith({
				identity: mockIdentity,
				derivationPath: [SOLANA_DERIVATION_PATH_PREFIX, mockNetwork],
				keyId: SOLANA_KEY_ID,
				message: Array.from(mockTransaction.messageBytes)
			});
			expect(signature).toEqual([{ [mockSolAddress]: Uint8Array.from(mockSignedBytes) }]);
		});

		it('should call signWithSchnorr for each transaction when signing multiple transactions', async () => {
			spySignWithSchnorr.mockResolvedValueOnce([4, 5, 6]).mockResolvedValueOnce([7, 8, 9]);

			const transactions = [mockTransaction, mockTransaction];
			const signer = createSigner({
				identity: mockIdentity,
				address: mockSolAddress,
				network: mockNetwork
			});
			const signatures = await signer.signTransactions(transactions);

			expect(spySignWithSchnorr).toHaveBeenCalledTimes(transactions.length);

			transactions.forEach((_, index) => {
				expect(spySignWithSchnorr).toHaveBeenNthCalledWith(index + 1, {
					identity: mockIdentity,
					derivationPath: [SOLANA_DERIVATION_PATH_PREFIX, mockNetwork],
					keyId: SOLANA_KEY_ID,
					message: Array.from(mockTransaction.messageBytes)
				});
			});

			expect(signatures).toEqual([
				{ [mockSolAddress]: Uint8Array.from([4, 5, 6]) },
				{ [mockSolAddress]: Uint8Array.from([7, 8, 9]) }
			]);
		});

		it('should throw an error if signWithSchnorr fails', async () => {
			spySignWithSchnorr.mockRejectedValueOnce(new Error('Mock Error'));

			const signer = createSigner({
				identity: mockIdentity,
				address: mockSolAddress,
				network: mockNetwork
			});

			await expect(signer.signTransactions([mockTransaction])).rejects.toThrow('Mock Error');
		});
	});
});
