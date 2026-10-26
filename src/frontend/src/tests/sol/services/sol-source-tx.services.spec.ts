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
	const simulationSlot = 150n;

	const confirmedStatus = {
		confirmationStatus: 'confirmed',
		confirmations: 3n,
		err: null,
		slot: 100n,
		status: { Ok: null }
	} as SolanaSignatureStatus;

	// A status read at or past the slot the blockhash read below answers at.
	const noStatus = { slot: 210n, status: null };

	const read = ({
		rowId = 'row-1',
		minContextSlot = simulationSlot
	}: { rowId?: string; minContextSlot?: bigint } = {}) =>
		readSolSourceTxOutcome({
			rowId,
			signature,
			blockhash,
			minContextSlot,
			network: SolanaNetworks.mainnet
		});

	beforeEach(() => {
		vi.clearAllMocks();
		resetSolSourceTxObservations();

		vi.mocked(getSignatureStatus).mockResolvedValue(noStatus);
		vi.mocked(isBlockhashValid).mockResolvedValue({ slot: 200n, valid: true });
	});

	describe('readSolSourceTxOutcome', () => {
		it('should read the status of the signature on the given network', async () => {
			vi.mocked(getSignatureStatus).mockResolvedValue({ slot: 210n, status: confirmedStatus });

			await expect(read()).resolves.toBe('succeeded');

			expect(getSignatureStatus).toHaveBeenCalledExactlyOnceWith({
				signature,
				network: SolanaNetworks.mainnet
			});
		});

		it('should not read the blockhash when there is a status', async () => {
			vi.mocked(getSignatureStatus).mockResolvedValue({ slot: 210n, status: confirmedStatus });

			await read();

			expect(isBlockhashValid).not.toHaveBeenCalled();
		});

		it('should read the blockhash at or past the given slot when there is no status, and stay pending while it is valid', async () => {
			await expect(read()).resolves.toBe('pending');

			expect(isBlockhashValid).toHaveBeenCalledExactlyOnceWith({
				blockhash,
				network: SolanaNetworks.mainnet,
				minContextSlot: simulationSlot
			});
			expect(getSignatureStatus).toHaveBeenCalledOnce();
		});

		it('should read the blockhash unanchored without a slot', async () => {
			await readSolSourceTxOutcome({
				rowId: 'row-1',
				signature,
				blockhash,
				network: SolanaNetworks.mainnet
			});

			expect(isBlockhashValid).toHaveBeenCalledExactlyOnceWith({
				blockhash,
				network: SolanaNetworks.mainnet,
				minContextSlot: undefined
			});
		});

		it('should return reverted at once for a confirmed status with an error', async () => {
			vi.mocked(getSignatureStatus).mockResolvedValue({
				slot: 210n,
				status: {
					...confirmedStatus,
					err: { InstructionError: [3, { Custom: 6001 }] }
				} as SolanaSignatureStatus
			});

			await expect(read()).resolves.toBe('reverted');
		});

		describe('an expired blockhash', () => {
			beforeEach(() => {
				vi.mocked(isBlockhashValid).mockResolvedValue({ slot: 200n, valid: false });
			});

			it('should read the status again before counting it', async () => {
				await read();

				expect(getSignatureStatus).toHaveBeenCalledTimes(2);
			});

			it('should read as pending on the first observation and expired on the second', async () => {
				await expect(read()).resolves.toBe('pending');
				await expect(read()).resolves.toBe('expired');
			});

			it('should count each row on its own', async () => {
				await expect(read({ rowId: 'row-1' })).resolves.toBe('pending');
				await expect(read({ rowId: 'row-2' })).resolves.toBe('pending');
				await expect(read({ rowId: 'row-1' })).resolves.toBe('expired');
			});

			it('should succeed a transaction that landed just before its blockhash aged out, from the second status read', async () => {
				vi.mocked(getSignatureStatus)
					.mockResolvedValueOnce(noStatus)
					.mockResolvedValueOnce({ slot: 211n, status: confirmedStatus });

				await expect(read()).resolves.toBe('succeeded');
			});

			it('should not count a missing status read behind the expired blockhash', async () => {
				vi.mocked(getSignatureStatus).mockResolvedValue({ slot: 199n, status: null });

				await expect(read()).resolves.toBe('pending');
				await expect(read()).resolves.toBe('pending');
				await expect(read()).resolves.toBe('pending');
			});

			it('should start over when a status appears between the two observations', async () => {
				await expect(read()).resolves.toBe('pending');

				vi.mocked(getSignatureStatus).mockResolvedValueOnce({
					slot: 210n,
					status: { ...confirmedStatus, confirmationStatus: 'processed' } as SolanaSignatureStatus
				});

				await expect(read()).resolves.toBe('pending');
				await expect(read()).resolves.toBe('pending');
				await expect(read()).resolves.toBe('expired');
			});

			it('should start over when the blockhash reads valid between the two observations', async () => {
				await expect(read()).resolves.toBe('pending');

				vi.mocked(isBlockhashValid).mockResolvedValueOnce({ slot: 200n, valid: true });

				await expect(read()).resolves.toBe('pending');
				await expect(read()).resolves.toBe('pending');
				await expect(read()).resolves.toBe('expired');
			});

			it('should start over after a reset, as after a reload', async () => {
				await expect(read()).resolves.toBe('pending');

				resetSolSourceTxObservations();

				await expect(read()).resolves.toBe('pending');
				await expect(read()).resolves.toBe('expired');
			});
		});

		describe('a node running behind', () => {
			const notReached = new Error('Minimum context slot has not been reached');

			it('should throw rather than answer when the node is behind the given slot', async () => {
				vi.mocked(isBlockhashValid).mockRejectedValue(notReached);

				await expect(read()).rejects.toThrow(notReached);
			});

			it('should not fail a transaction that lands once the node catches up', async () => {
				vi.mocked(isBlockhashValid).mockRejectedValue(notReached);

				await expect(read()).rejects.toThrow(notReached);
				await expect(read()).rejects.toThrow(notReached);

				vi.mocked(getSignatureStatus).mockResolvedValue({ slot: 230n, status: confirmedStatus });

				await expect(read()).resolves.toBe('succeeded');
			});

			it('should not fail a transaction whose status reads missing behind the blockhash, twice, before catching up', async () => {
				vi.mocked(isBlockhashValid).mockResolvedValue({ slot: 200n, valid: false });
				vi.mocked(getSignatureStatus).mockResolvedValue({ slot: 180n, status: null });

				await expect(read()).resolves.toBe('pending');
				await expect(read()).resolves.toBe('pending');

				vi.mocked(getSignatureStatus).mockResolvedValue({ slot: 230n, status: confirmedStatus });

				await expect(read()).resolves.toBe('succeeded');
			});
		});
	});
});
