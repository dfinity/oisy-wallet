import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { getIdbBalances } from '$lib/api/idb-balances.api';
import { IDB_DEADLINE_MILLIS } from '$lib/constants/app.constants';
import { syncWalletFromIdbCache } from '$lib/services/listener.services';
import { balancesStore } from '$lib/stores/balances.store';
import type { TransactionsStore } from '$lib/stores/transactions.store';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';

vi.mock('$lib/api/idb-balances.api', () => ({
	getIdbBalances: vi.fn()
}));

describe('listener.services', () => {
	describe('syncWalletFromIdbCache', () => {
		const mockToken = BONK_TOKEN;
		const mockTokenId = mockToken.id;
		const mockNetworkId = mockToken.network.id;

		const mockAppend = vi.fn();

		const mockGetIdbTransactions = vi.fn();
		const mockTransactionsStore = {
			append: mockAppend
		} as unknown as TransactionsStore<SolTransactionUi>;

		const mockParams = {
			tokenId: mockTokenId,
			networkId: mockNetworkId,
			getIdbTransactions: mockGetIdbTransactions,
			transactionsStore: mockTransactionsStore
		};

		beforeEach(() => {
			vi.clearAllMocks();

			mockAuthStore();

			vi.spyOn(balancesStore, 'batchSet');

			balancesStore.reset(mockTokenId);
		});

		it('should return early if identity is nullish', async () => {
			mockAuthStore(null);

			await syncWalletFromIdbCache(mockParams);

			expect(mockGetIdbTransactions).not.toHaveBeenCalled();
			expect(mockAppend).not.toHaveBeenCalled();
		});

		it('should call getIdbTransactions with correct parameters', async () => {
			await syncWalletFromIdbCache(mockParams);

			expect(mockGetIdbTransactions).toHaveBeenCalledWith({
				tokenId: mockTokenId,
				networkId: mockNetworkId,
				principal: mockIdentity.getPrincipal()
			});

			expect(mockAppend).not.toHaveBeenCalled();
		});

		it('should call getIdbBalances with correct parameters', async () => {
			await syncWalletFromIdbCache(mockParams);

			expect(getIdbBalances).toHaveBeenCalledWith({
				tokenId: mockTokenId,
				networkId: mockNetworkId,
				principal: mockIdentity.getPrincipal()
			});

			expect(balancesStore.batchSet).not.toHaveBeenCalled();
		});

		it('should not return early if getIdbTransactions returns nullish', async () => {
			mockGetIdbTransactions.mockResolvedValueOnce(undefined);

			await syncWalletFromIdbCache(mockParams);

			expect(mockGetIdbTransactions).toHaveBeenCalledWith({
				tokenId: mockTokenId,
				networkId: mockNetworkId,
				principal: mockIdentity.getPrincipal()
			});

			expect(mockAppend).not.toHaveBeenCalled();

			expect(getIdbBalances).toHaveBeenCalledWith({
				tokenId: mockTokenId,
				networkId: mockNetworkId,
				principal: mockIdentity.getPrincipal()
			});
		});

		it('should return early if getIdbBalances returns nullish', async () => {
			vi.mocked(getIdbBalances).mockResolvedValueOnce(undefined);

			await syncWalletFromIdbCache(mockParams);

			expect(mockGetIdbTransactions).toHaveBeenCalledWith({
				tokenId: mockTokenId,
				networkId: mockNetworkId,
				principal: mockIdentity.getPrincipal()
			});

			expect(mockTransactionsStore.append).not.toHaveBeenCalled();

			expect(getIdbBalances).toHaveBeenCalledWith({
				tokenId: mockTokenId,
				networkId: mockNetworkId,
				principal: mockIdentity.getPrincipal()
			});

			expect(balancesStore.batchSet).not.toHaveBeenCalled();
		});

		it('should append transactions to store', async () => {
			const mockTxs = [{ id: 'tx-1' }, { id: 'tx-2' }];

			mockGetIdbTransactions.mockResolvedValue(mockTxs);

			await syncWalletFromIdbCache(mockParams);

			expect(mockGetIdbTransactions).toHaveBeenCalledWith({
				tokenId: mockTokenId,
				networkId: mockNetworkId,
				principal: mockIdentity.getPrincipal()
			});

			expect(mockTransactionsStore.append).toHaveBeenCalledWith({
				tokenId: mockTokenId,
				transactions: mockTxs.map((tx) => ({
					data: tx,
					certified: false
				}))
			});
		});

		it('should set balance in balancesStore', async () => {
			const mockBalance = 123n;

			vi.mocked(getIdbBalances).mockResolvedValue(mockBalance);

			await syncWalletFromIdbCache(mockParams);

			expect(getIdbBalances).toHaveBeenCalledWith({
				tokenId: mockTokenId,
				networkId: mockNetworkId,
				principal: mockIdentity.getPrincipal()
			});

			expect(balancesStore.batchSet).toHaveBeenCalledWith({
				id: mockTokenId,
				data: {
					data: mockBalance,
					certified: false
				}
			});
		});

		it('should throw if getIdbTransactions throws an error', async () => {
			const mockError = new Error('Database error');
			mockGetIdbTransactions.mockRejectedValueOnce(mockError);

			await expect(syncWalletFromIdbCache(mockParams)).rejects.toThrow(mockError);

			expect(mockGetIdbTransactions).toHaveBeenCalledWith({
				tokenId: mockTokenId,
				networkId: mockNetworkId,
				principal: mockIdentity.getPrincipal()
			});

			expect(mockAppend).not.toHaveBeenCalled();

			expect(getIdbBalances).not.toHaveBeenCalled();
		});

		it('should throw if getIdbBalances throws an error', async () => {
			const mockError = new Error('Database error');
			vi.mocked(getIdbBalances).mockRejectedValueOnce(mockError);

			await expect(syncWalletFromIdbCache(mockParams)).rejects.toThrow(mockError);

			expect(mockGetIdbTransactions).toHaveBeenCalledWith({
				tokenId: mockTokenId,
				networkId: mockNetworkId,
				principal: mockIdentity.getPrincipal()
			});

			expect(getIdbBalances).toHaveBeenCalledWith({
				tokenId: mockTokenId,
				networkId: mockNetworkId,
				principal: mockIdentity.getPrincipal()
			});

			expect(balancesStore.batchSet).not.toHaveBeenCalled();
		});

		// A wallet worker does not start until this has resolved — `SolWalletWorker.init` awaits it for
		// every enabled token — and IndexedDB can fail by answering nothing at all. Without a deadline
		// the worker never starts and every balance of the network stays on a skeleton, silently.
		it('should give up on a cache that never answers rather than hold up its caller', async () => {
			vi.useFakeTimers();

			mockGetIdbTransactions.mockReturnValue(new Promise(() => {}));

			let settled = false;

			const syncing = syncWalletFromIdbCache(mockParams).then(() => {
				settled = true;
			});

			await vi.advanceTimersByTimeAsync(IDB_DEADLINE_MILLIS - 1);

			expect(settled).toBeFalsy();

			await vi.advanceTimersByTimeAsync(1);

			await syncing;

			expect(settled).toBeTruthy();
			expect(mockAppend).not.toHaveBeenCalled();

			vi.useRealTimers();
		});
	});
});
