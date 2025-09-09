import { getStatus } from '$icp/api/icrc-index-ng.api';
import { getBlocks } from '$icp/api/icrc-ledger.api';
import { isIndexCanisterAwake } from '$icp/services/index-canister.services';
import { mockIndexCanisterId, mockLedgerCanisterId } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { IcrcGetBlocksResult, IcrcNgStatus } from '@dfinity/ledger-icrc';

vi.mock('$icp/api/icrc-index-ng.api', () => ({
	getStatus: vi.fn()
}));

vi.mock('$icp/api/icrc-ledger.api', () => ({
	getBlocks: vi.fn()
}));

describe('index-canister.services', () => {
	describe('isIndexCanisterAwake', () => {
		const mockParams = {
			identity: mockIdentity,
			ledgerCanisterId: mockLedgerCanisterId,
			indexCanisterId: mockIndexCanisterId
		};

		const mockTotalBlocks = 123n;

		const mockGetBlocksResponse: IcrcGetBlocksResult = {
			log_length: mockTotalBlocks,
			blocks: [],
			archived_blocks: []
		};

		const mockIndexCanisterStatus: IcrcNgStatus = { num_blocks_synced: mockTotalBlocks };

		beforeEach(() => {
			vi.clearAllMocks();

			vi.mocked(getStatus).mockResolvedValue(mockIndexCanisterStatus);

			vi.mocked(getBlocks).mockResolvedValue(mockGetBlocksResponse);
		});

		it('should call Index canister `getStatus` with the correct parameters', async () => {
			await isIndexCanisterAwake(mockParams);

			expect(getStatus).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				indexCanisterId: mockIndexCanisterId,
				certified: true
			});
		});

		it('should call Ledger canister `getBlocks` with the correct parameters', async () => {
			await isIndexCanisterAwake(mockParams);

			expect(getBlocks).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				ledgerCanisterId: mockLedgerCanisterId,
				certified: true,
				args: []
			});
		});

		it('should return true if Index canister synced blocks equals Ledger canister total blocks', async () => {
			const result = await isIndexCanisterAwake(mockParams);

			expect(result).toBeTruthy();
		});

		it('should return true if Index canister synced blocks equals Ledger canister total blocks and both are zero', async () => {
			vi.mocked(getStatus).mockResolvedValueOnce({
				...mockIndexCanisterStatus,
				num_blocks_synced: 0n
			});
			vi.mocked(getBlocks).mockResolvedValueOnce({ ...mockGetBlocksResponse, log_length: 0n });

			const result = await isIndexCanisterAwake(mockParams);

			expect(result).toBeTruthy();
		});

		it('should call `getStatus` again if Index canister synced blocks number does not match the Ledger canister total blocks', async () => {
			vi.useFakeTimers();

			vi.mocked(getStatus)
				.mockResolvedValueOnce({
					...mockIndexCanisterStatus,
					num_blocks_synced: mockTotalBlocks - 1n
				})
				.mockResolvedValue(mockIndexCanisterStatus);

			const promise = isIndexCanisterAwake(mockParams);

			await vi.advanceTimersByTimeAsync(5000);

			await promise;

			expect(getStatus).toHaveBeenCalledTimes(2);
			expect(getStatus).toHaveBeenNthCalledWith(1, {
				identity: mockIdentity,
				indexCanisterId: mockIndexCanisterId,
				certified: true
			});
			expect(getStatus).toHaveBeenNthCalledWith(2, {
				identity: mockIdentity,
				indexCanisterId: mockIndexCanisterId,
				certified: true
			});

			vi.useRealTimers();
		});

		it('should return true if Index canister synced blocks number changes after an interval of time', async () => {
			vi.useFakeTimers();

			vi.mocked(getStatus)
				.mockResolvedValueOnce({
					...mockIndexCanisterStatus,
					num_blocks_synced: mockTotalBlocks - 1n
				})
				.mockResolvedValue(mockIndexCanisterStatus);

			const promise = isIndexCanisterAwake(mockParams);

			await vi.advanceTimersByTimeAsync(5000);

			const result = await promise;

			expect(result).toBeTruthy();

			vi.useRealTimers();
		});

		it('should return false if Index canister synced blocks number stays the same after an interval of time', async () => {
			vi.useFakeTimers();

			vi.mocked(getStatus).mockResolvedValue({
				...mockIndexCanisterStatus,
				num_blocks_synced: mockTotalBlocks - 1n
			});

			const promise = isIndexCanisterAwake(mockParams);

			await vi.advanceTimersByTimeAsync(5000);

			const result = await promise;

			expect(result).toBeFalsy();

			vi.useRealTimers();
		});
	});
});
