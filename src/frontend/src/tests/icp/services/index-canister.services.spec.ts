import { getTransactions } from '$icp/api/icrc-index-ng.api';
import { balance } from '$icp/api/icrc-ledger.api';
import { isIndexCanisterAwake } from '$icp/services/index-canister.services';
import { mockIndexCanisterId, mockLedgerCanisterId } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { IcrcIndexNgGetTransactions, IcrcTransactionWithId } from '@dfinity/ledger-icrc';
import { toNullable } from '@dfinity/utils';

vi.mock('$icp/api/icrc-index-ng.api', () => ({
	getTransactions: vi.fn()
}));

vi.mock('$icp/api/icrc-ledger.api', () => ({
	balance: vi.fn()
}));

describe('index-canister.services', () => {
	describe('isIndexCanisterAwake', () => {
		const mockParams = {
			identity: mockIdentity,
			ledgerCanisterId: mockLedgerCanisterId,
			indexCanisterId: mockIndexCanisterId
		};

		const mockTransactions: IcrcTransactionWithId[] = [
			{ id: 1n, transaction: {} },
			{ id: 2n, transaction: {} },
			{ id: 3n, transaction: {} }
		] as IcrcTransactionWithId[];

		const mockGetTransactionsResponse: IcrcIndexNgGetTransactions = {
			balance: 1000n,
			transactions: mockTransactions,
			oldest_tx_id: toNullable(123n)
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should call getTransactions with the correct parameters', async () => {
			vi.mocked(getTransactions).mockResolvedValueOnce(mockGetTransactionsResponse);

			await isIndexCanisterAwake(mockParams);

			expect(getTransactions).toHaveBeenCalledOnce();
			expect(getTransactions).toHaveBeenNthCalledWith(1, {
				identity: mockIdentity,
				indexCanisterId: mockIndexCanisterId,
				certified: true,
				owner: mockIdentity.getPrincipal()
			});
		});

		it('should return true if Index canister balance is not zero and it has transactions', async () => {
			vi.mocked(getTransactions).mockResolvedValueOnce(mockGetTransactionsResponse);

			const result = await isIndexCanisterAwake(mockParams);

			expect(result).toBeTruthy();

			expect(balance).not.toHaveBeenCalled();
		});

		it('should return true if Index canister balance is not zero, but it has no transactions', async () => {
			vi.mocked(getTransactions).mockResolvedValueOnce({
				...mockGetTransactionsResponse,
				transactions: []
			});

			const result = await isIndexCanisterAwake(mockParams);

			expect(result).toBeTruthy();

			expect(balance).not.toHaveBeenCalled();
		});

		it('should return true if Index canister has transactions, but balance is zero', async () => {
			vi.mocked(getTransactions).mockResolvedValueOnce({
				...mockGetTransactionsResponse,
				balance: 0n
			});

			const result = await isIndexCanisterAwake(mockParams);

			expect(result).toBeTruthy();

			expect(balance).not.toHaveBeenCalled();
		});

		it('should call `balance` if Index canister has no transactions and balance is zero', async () => {
			vi.mocked(getTransactions).mockResolvedValueOnce({
				...mockGetTransactionsResponse,
				balance: 0n,
				transactions: []
			});
			vi.mocked(balance).mockResolvedValueOnce(0n);

			await isIndexCanisterAwake(mockParams);

			expect(balance).toHaveBeenCalledOnce();
			expect(balance).toHaveBeenNthCalledWith(1, {
				identity: mockIdentity,
				ledgerCanisterId: mockLedgerCanisterId,
				certified: true,
				owner: mockIdentity.getPrincipal()
			});
		});

		it('should return true if Ledger canister and Index canister balances match and are zero', async () => {
			vi.mocked(getTransactions).mockResolvedValueOnce({
				...mockGetTransactionsResponse,
				balance: 0n,
				transactions: []
			});
			vi.mocked(balance).mockResolvedValueOnce(0n);

			const result = await isIndexCanisterAwake(mockParams);

			expect(result).toBeTruthy();
		});

		it('should return true if Index canister balance equals Ledger canister balance', async () => {
			vi.mocked(getTransactions).mockResolvedValueOnce(mockGetTransactionsResponse);
			vi.mocked(balance).mockResolvedValueOnce(mockGetTransactionsResponse.balance);

			const result = await isIndexCanisterAwake(mockParams);

			expect(result).toBeTruthy();
		});

		it('should call `getTransactions` again if Index canister balance or transactions do not change after an interval of time', async () => {
			vi.useFakeTimers();

			vi.mocked(getTransactions)
				.mockResolvedValueOnce({ ...mockGetTransactionsResponse, balance: 0n, transactions: [] })
				.mockResolvedValueOnce(mockGetTransactionsResponse);
			vi.mocked(balance).mockResolvedValueOnce(mockGetTransactionsResponse.balance);

			const promise = isIndexCanisterAwake(mockParams);

			await vi.advanceTimersByTimeAsync(5000);

			await promise;

			expect(getTransactions).toHaveBeenCalledTimes(2);
			expect(getTransactions).toHaveBeenNthCalledWith(1, {
				identity: mockIdentity,
				indexCanisterId: mockIndexCanisterId,
				certified: true,
				owner: mockIdentity.getPrincipal()
			});
			expect(getTransactions).toHaveBeenNthCalledWith(2, {
				identity: mockIdentity,
				indexCanisterId: mockIndexCanisterId,
				certified: true,
				owner: mockIdentity.getPrincipal()
			});

			vi.useRealTimers();
		});

		it('should return true if Index canister balance or transactions change after an interval of time', async () => {
			vi.useFakeTimers();

			vi.mocked(getTransactions)
				.mockResolvedValueOnce({ ...mockGetTransactionsResponse, balance: 0n, transactions: [] })
				.mockResolvedValueOnce(mockGetTransactionsResponse);
			vi.mocked(balance).mockResolvedValueOnce(mockGetTransactionsResponse.balance);

			const promise = isIndexCanisterAwake(mockParams);

			await vi.advanceTimersByTimeAsync(5000);

			const result = await promise;

			expect(result).toBeTruthy();

			vi.useRealTimers();
		});

		it('should return false if index balance stays the same after an interval of time', async () => {
			vi.useFakeTimers();

			vi.mocked(getTransactions)
				.mockResolvedValueOnce({ ...mockGetTransactionsResponse, balance: 0n, transactions: [] })
				.mockResolvedValueOnce({ ...mockGetTransactionsResponse, balance: 0n, transactions: [] });
			vi.mocked(balance).mockResolvedValueOnce(mockGetTransactionsResponse.balance);

			const promise = isIndexCanisterAwake(mockParams);

			await vi.advanceTimersByTimeAsync(5000);

			const result = await promise;

			expect(result).toBeFalsy();

			vi.useRealTimers();
		});
	});
});
