import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { getIdbBalances } from '$lib/api/idb-balances.api';
import { getIdbSolTransactions } from '$lib/api/idb-transactions.api';
import { balancesStore } from '$lib/stores/balances.store';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import {
	syncWallet,
	syncWalletError,
	syncWalletFromCache
} from '$sol/services/sol-listener.services';
import {
	solTransactionsStore,
	type SolCertifiedTransaction
} from '$sol/stores/sol-transactions.store';
import type { SolBalance } from '$sol/types/sol-balance';
import type { SolPostMessageDataResponseWallet } from '$sol/types/sol-post-message';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import {
	createMockSolTransactionsUi,
	mockSolCertifiedTransactions
} from '$tests/mocks/sol-transactions.mock';
import { jsonReplacer } from '@dfinity/utils';
import { lamports } from '@solana/kit';
import { get } from 'svelte/store';

vi.mock(import('$lib/api/idb-transactions.api'), async (importOriginal) => ({
	...(await importOriginal()),
	getIdbSolTransactions: vi.fn()
}));

vi.mock(import('$lib/api/idb-balances.api'), async (importOriginal) => ({
	...(await importOriginal()),
	getIdbBalances: vi.fn()
}));

describe('sol-listener.services', () => {
	describe('sol-listener', () => {
		const tokenId: TokenId = parseTokenId('testTokenId');
		const mockBalance = lamports(1000n);

		const mockPostMessage = ({
			balance = mockBalance,
			newTransactions = JSON.stringify(mockSolCertifiedTransactions, jsonReplacer)
		}: {
			balance?: SolBalance | null;
			newTransactions?: string;
		}): SolPostMessageDataResponseWallet => ({
			wallet: {
				balance: {
					certified: true,
					data: balance
				},
				newTransactions
			}
		});

		beforeEach(() => {
			vi.clearAllMocks();
			balancesStore.reset(tokenId);
			solTransactionsStore.reset(tokenId);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		describe('syncWallet', () => {
			it('should set the balance in balancesStore', async () => {
				vi.useFakeTimers();

				syncWallet({ data: mockPostMessage({}), tokenId });

				await vi.runAllTimersAsync();

				const balance = get(balancesStore);

				expect(balance?.[tokenId]).toEqual({
					data: mockBalance,
					certified: true
				});
			});

			it('should reset balanceStore if balance is empty', () => {
				syncWallet({ data: mockPostMessage({ balance: null }), tokenId });

				const balance = get(balancesStore);

				expect(balance?.[tokenId]).toBeNull();
			});

			it('should prepend new transactions to solTransactionsStore', () => {
				const newTransactions = JSON.stringify(mockSolCertifiedTransactions, jsonReplacer);
				syncWallet({ data: mockPostMessage({ newTransactions }), tokenId });

				const transactions = get(solTransactionsStore);

				expect(transactions?.[tokenId]).toEqual(mockSolCertifiedTransactions);
			});

			// Older builds stored one row per instruction (`<signature>-<index>`); the current worker
			// emits one record per signature, so those rows must go once the record arrives.
			describe('stale per-instruction rows', () => {
				const [{ data: baseTransaction }, otherTransaction] = mockSolCertifiedTransactions;
				const signature = String(baseTransaction.signature);

				const toCertified = (id: string): SolCertifiedTransaction => ({
					data: { ...baseTransaction, id },
					certified: false
				});

				const instructionRows = [toCertified(`${signature}-0`), toCertified(`${signature}-1`)];
				const record = toCertified(signature);

				const syncTransactions = (transactions: SolCertifiedTransaction[]) =>
					syncWallet({
						data: mockPostMessage({
							newTransactions: JSON.stringify(transactions, jsonReplacer)
						}),
						tokenId
					});

				it('should replace the per-instruction rows of a signature with its record', () => {
					solTransactionsStore.set({ tokenId, transactions: instructionRows });

					syncTransactions([record]);

					expect(get(solTransactionsStore)?.[tokenId]).toEqual([record]);
				});

				it('should keep the rows of other signatures', () => {
					solTransactionsStore.set({
						tokenId,
						transactions: [...instructionRows, otherTransaction]
					});

					syncTransactions([record]);

					expect(get(solTransactionsStore)?.[tokenId]).toEqual([record, otherTransaction]);
				});

				it('should not duplicate a record re-sent with the same id', () => {
					solTransactionsStore.set({ tokenId, transactions: [record, otherTransaction] });

					syncTransactions([record]);

					expect(get(solTransactionsStore)?.[tokenId]).toEqual([record, otherTransaction]);
				});
			});
		});

		describe('syncWalletError', () => {
			it('should reset balanceStore on error', () => {
				syncWallet({ data: mockPostMessage({}), tokenId });

				syncWalletError({ error: 'test error', tokenId, hideToast: true });

				const balance = get(balancesStore);

				expect(balance?.[tokenId]).toBeNull();
			});

			it('should reset transactionsStore on error', () => {
				const newTransactions = JSON.stringify(mockSolCertifiedTransactions, jsonReplacer);
				syncWallet({ data: mockPostMessage({ newTransactions }), tokenId });

				syncWalletError({ error: 'test error', tokenId, hideToast: true });

				const transactions = get(solTransactionsStore);

				expect(transactions?.[tokenId]).toBeNull();
			});

			it('should log a warning if hideToast is true', () => {
				syncWalletError({ error: 'test error', tokenId, hideToast: true });

				expect(console.warn).toHaveBeenCalled();
			});
		});

		describe('syncWalletFromCache', () => {
			beforeEach(() => {
				mockAuthStore();

				vi.mocked(getIdbBalances).mockResolvedValue(undefined);
			});

			// Earlier versions cached the backend copy of a record, which has no summary. It is not
			// what the chain says, so it must not reach the store.
			it('should leave out cached records that were not derived from chain data', async () => {
				const [derived, restored] = createMockSolTransactionsUi(2);
				const derivedRecord = { ...derived, summary: { kind: 'send' as const } };

				vi.mocked(getIdbSolTransactions).mockResolvedValue([
					derivedRecord,
					{ ...restored, summary: undefined }
				]);

				await syncWalletFromCache({ tokenId, networkId: SOLANA_MAINNET_NETWORK_ID });

				expect(get(solTransactionsStore)?.[tokenId]).toEqual([
					{ data: derivedRecord, certified: false }
				]);
			});
		});
	});
});
