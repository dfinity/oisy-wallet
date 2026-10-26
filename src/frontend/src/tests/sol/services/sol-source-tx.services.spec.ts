import { getSignatureStatus, isBlockhashValid } from '$sol/api/solana.api';
import {
	readSolSourceTxOutcome,
	resetSolSourceTxObservations
} from '$sol/services/sol-source-tx.services';
import { SolanaNetworks } from '$sol/types/network';
import type { SolanaSignatureStatus } from '$sol/types/sol-rpc';

vi.mock('$sol/api/solana.api', () => ({
	getSignatureStatus: vi.fn(),
	isBlockhashValid: vi.fn()
}));

describe('sol-source-tx.services', () => {
	const signature = '5'.repeat(88);
	const blockhash = 'HSR6rNUUeh6Grf2mVzP6u33wEfvXeLt7rNaTqkQoFLtN';

	const confirmedStatus = {
		confirmationStatus: 'confirmed',
		confirmations: 3n,
		err: null,
		slot: 100n,
		status: { Ok: null }
	} as SolanaSignatureStatus;

	const read = (rowId = 'row-1') =>
		readSolSourceTxOutcome({ rowId, signature, blockhash, network: SolanaNetworks.mainnet });

	beforeEach(() => {
		vi.clearAllMocks();
		resetSolSourceTxObservations();

		vi.mocked(getSignatureStatus).mockResolvedValue(null);
		vi.mocked(isBlockhashValid).mockResolvedValue(true);
	});

	describe('readSolSourceTxOutcome', () => {
		it('should read the status of the signature on the given network', async () => {
			vi.mocked(getSignatureStatus).mockResolvedValue(confirmedStatus);

			await expect(read()).resolves.toBe('succeeded');

			expect(getSignatureStatus).toHaveBeenCalledExactlyOnceWith({
				signature,
				network: SolanaNetworks.mainnet
			});
		});

		it('should not read the blockhash when there is a status', async () => {
			vi.mocked(getSignatureStatus).mockResolvedValue(confirmedStatus);

			await read();

			expect(isBlockhashValid).not.toHaveBeenCalled();
		});

		it('should read the blockhash when there is no status, and stay pending while it is valid', async () => {
			await expect(read()).resolves.toBe('pending');

			expect(isBlockhashValid).toHaveBeenCalledExactlyOnceWith({
				blockhash,
				network: SolanaNetworks.mainnet
			});
		});

		it('should return reverted at once for a confirmed status with an error', async () => {
			vi.mocked(getSignatureStatus).mockResolvedValue({
				...confirmedStatus,
				err: { InstructionError: [3, { Custom: 6001 }] }
			} as SolanaSignatureStatus);

			await expect(read()).resolves.toBe('reverted');
		});

		describe('an expired blockhash', () => {
			beforeEach(() => {
				vi.mocked(isBlockhashValid).mockResolvedValue(false);
			});

			it('should read as pending on the first observation and expired on the second', async () => {
				await expect(read()).resolves.toBe('pending');
				await expect(read()).resolves.toBe('expired');
			});

			it('should count each row on its own', async () => {
				await expect(read('row-1')).resolves.toBe('pending');
				await expect(read('row-2')).resolves.toBe('pending');
				await expect(read('row-1')).resolves.toBe('expired');
			});

			it('should start over when a status appears between the two observations', async () => {
				await expect(read()).resolves.toBe('pending');

				vi.mocked(getSignatureStatus).mockResolvedValueOnce({
					...confirmedStatus,
					confirmationStatus: 'processed'
				} as SolanaSignatureStatus);

				await expect(read()).resolves.toBe('pending');
				await expect(read()).resolves.toBe('pending');
				await expect(read()).resolves.toBe('expired');
			});

			it('should start over when the blockhash reads valid between the two observations', async () => {
				await expect(read()).resolves.toBe('pending');

				vi.mocked(isBlockhashValid).mockResolvedValueOnce(true);

				await expect(read()).resolves.toBe('pending');
				await expect(read()).resolves.toBe('pending');
				await expect(read()).resolves.toBe('expired');
			});

			it('should succeed a transaction that landed just before its blockhash aged out', async () => {
				await expect(read()).resolves.toBe('pending');

				vi.mocked(getSignatureStatus).mockResolvedValue(confirmedStatus);

				await expect(read()).resolves.toBe('succeeded');
			});

			it('should start over after a reset, as after a reload', async () => {
				await expect(read()).resolves.toBe('pending');

				resetSolSourceTxObservations();

				await expect(read()).resolves.toBe('pending');
				await expect(read()).resolves.toBe('expired');
			});
		});
	});
});
