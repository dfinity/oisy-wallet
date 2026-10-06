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
import type { SolAddress } from '$sol/types/address';
import type { SolNetworkBalances } from '$sol/types/sol-balance';
import type {
	SolPostMessageDataResponseWallet,
	SolWalletRouting
} from '$sol/types/sol-post-message';
import type { SolResolvedTransaction, SolTransactionUi } from '$sol/types/sol-transaction';
import type { SplTokenAddress } from '$sol/types/spl';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { createMockSolTransactionsUi } from '$tests/mocks/sol-transactions.mock';
import {
	mockAtaAddress,
	mockAtaAddress2,
	mockAtaAddress3,
	mockSolAddress,
	mockSolAddress2,
	mockSplAddress
} from '$tests/mocks/sol.mock';
import { jsonReplacer } from '@dfinity/utils';
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
	const nativeTokenId: TokenId = parseTokenId('nativeTokenId');
	const splTokenId: TokenId = parseTokenId('splTokenId');
	const splTokenId2: TokenId = parseTokenId('splTokenId2');
	const tokenIds = [nativeTokenId, splTokenId, splTokenId2];

	const mint: SplTokenAddress = mockSplAddress;
	const mint2: SplTokenAddress = mockSolAddress2;

	// The wallet is the source of native SOL, each associated token account the source of its mint.
	const routing: SolWalletRouting = {
		nativeTokenId,
		splTokenIds: new Map([
			[mint, splTokenId],
			[mint2, splTokenId2]
		]),
		sourceTokens: new Map<SolAddress, SplTokenAddress | null>([
			[mockSolAddress, null],
			[mockAtaAddress, mint],
			[mockAtaAddress2, mint2]
		])
	};

	const mockBalances: SolNetworkBalances = { sol: 1000n, spl: { [mint]: 5n, [mint2]: 7n } };

	const mockPostMessage = ({
		balances = mockBalances,
		transactions = []
	}: {
		balances?: SolNetworkBalances;
		transactions?: SolResolvedTransaction[];
	}): SolPostMessageDataResponseWallet => ({
		wallet: {
			balances,
			newTransactions: JSON.stringify(transactions, jsonReplacer)
		}
	});

	const toCertified = (transaction: SolTransactionUi): SolCertifiedTransaction => ({
		data: transaction,
		certified: false
	});

	const [transaction, transaction2] = createMockSolTransactionsUi(2);

	const storedTransactions = (tokenId: TokenId) => get(solTransactionsStore)?.[tokenId];

	beforeEach(() => {
		vi.clearAllMocks();

		tokenIds.forEach((tokenId) => {
			balancesStore.reset(tokenId);
			solTransactionsStore.reset(tokenId);
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('syncWallet', () => {
		it('should set the SOL balance on the native token and each SPL balance on the token of its mint', async () => {
			vi.useFakeTimers();

			syncWallet({ data: mockPostMessage({}), routing });

			await vi.runAllTimersAsync();

			const balances = get(balancesStore);

			expect(balances?.[nativeTokenId]).toEqual({ data: 1000n, certified: false });
			expect(balances?.[splTokenId]).toEqual({ data: 5n, certified: false });
			expect(balances?.[splTokenId2]).toEqual({ data: 7n, certified: false });
		});

		// The balances leave out a mint whose account could not be read, so as not to report zero for a
		// balance the user may well hold.
		it('should keep the balance of an SPL token whose mint the balances leave out', async () => {
			vi.useFakeTimers();

			balancesStore.set({ id: splTokenId2, data: { data: 9n, certified: false } });

			syncWallet({
				data: mockPostMessage({ balances: { sol: 1000n, spl: { [mint]: 5n } } }),
				routing
			});

			await vi.runAllTimersAsync();

			expect(get(balancesStore)?.[splTokenId2]).toEqual({ data: 9n, certified: false });
		});

		it('should write a record to the token of the source that returned it', () => {
			syncWallet({
				data: mockPostMessage({ transactions: [{ transaction, sources: [mockAtaAddress] }] }),
				routing
			});

			expect(storedTransactions(splTokenId)).toEqual([toCertified(transaction)]);
			expect(storedTransactions(nativeTokenId)).toEqual([]);
			expect(storedTransactions(splTokenId2)).toEqual([]);
		});

		it('should write a record returned by the wallet and two token accounts to all three tokens', () => {
			syncWallet({
				data: mockPostMessage({
					transactions: [
						{ transaction, sources: [mockSolAddress, mockAtaAddress, mockAtaAddress2] }
					]
				}),
				routing
			});

			tokenIds.forEach((tokenId) =>
				expect(storedTransactions(tokenId)).toEqual([toCertified(transaction)])
			);
		});

		it('should drop a record from a source the routing does not know', () => {
			syncWallet({
				data: mockPostMessage({ transactions: [{ transaction, sources: [mockAtaAddress3] }] }),
				routing
			});

			tokenIds.forEach((tokenId) => expect(storedTransactions(tokenId)).toEqual([]));
		});

		// A token without an entry in the store is still loading.
		it('should give every token of the network a list, even an empty one', () => {
			syncWallet({ data: mockPostMessage({}), routing });

			tokenIds.forEach((tokenId) => expect(storedTransactions(tokenId)).toEqual([]));
		});

		it('should prepend new records to the ones a token holds', () => {
			solTransactionsStore.set({
				tokenId: nativeTokenId,
				transactions: [toCertified(transaction2)]
			});

			syncWallet({
				data: mockPostMessage({ transactions: [{ transaction, sources: [mockSolAddress] }] }),
				routing
			});

			expect(storedTransactions(nativeTokenId)).toEqual([
				toCertified(transaction),
				toCertified(transaction2)
			]);
		});

		// Older builds stored one row per instruction (`<signature>-<index>`); the worker emits one
		// record per signature, so those rows must go once the record arrives.
		describe('stale per-instruction rows', () => {
			const signature = String(transaction.signature);

			const withId = (id: string): SolCertifiedTransaction => toCertified({ ...transaction, id });

			const instructionRows = [withId(`${signature}-0`), withId(`${signature}-1`)];
			const record = withId(signature);
			const otherRecord = toCertified(transaction2);

			const syncRecord = (sources: SolAddress[]) =>
				syncWallet({
					data: mockPostMessage({ transactions: [{ transaction: record.data, sources }] }),
					routing
				});

			it('should replace the per-instruction rows of a signature with its record', () => {
				solTransactionsStore.set({ tokenId: nativeTokenId, transactions: instructionRows });

				syncRecord([mockSolAddress]);

				expect(storedTransactions(nativeTokenId)).toEqual([record]);
			});

			it('should keep the rows of other signatures', () => {
				solTransactionsStore.set({
					tokenId: nativeTokenId,
					transactions: [...instructionRows, otherRecord]
				});

				syncRecord([mockSolAddress]);

				expect(storedTransactions(nativeTokenId)).toEqual([record, otherRecord]);
			});

			it('should not duplicate a record re-sent with the same id', () => {
				solTransactionsStore.set({ tokenId: nativeTokenId, transactions: [record, otherRecord] });

				syncRecord([mockSolAddress]);

				expect(storedTransactions(nativeTokenId)).toEqual([record, otherRecord]);
			});

			it('should replace the per-instruction rows in every token the record reaches', () => {
				solTransactionsStore.set({ tokenId: nativeTokenId, transactions: instructionRows });
				solTransactionsStore.set({ tokenId: splTokenId, transactions: instructionRows });

				syncRecord([mockSolAddress, mockAtaAddress]);

				expect(storedTransactions(nativeTokenId)).toEqual([record]);
				expect(storedTransactions(splTokenId)).toEqual([record]);
			});
		});
	});

	describe('syncWalletError', () => {
		beforeEach(() => {
			syncWallet({
				data: mockPostMessage({ transactions: [{ transaction, sources: [mockSolAddress] }] }),
				routing
			});
		});

		it('should reset balanceStore on error', () => {
			syncWalletError({ error: 'test error', tokenId: nativeTokenId, hideToast: true });

			expect(get(balancesStore)?.[nativeTokenId]).toBeNull();
		});

		it('should reset transactionsStore on error', () => {
			syncWalletError({ error: 'test error', tokenId: nativeTokenId, hideToast: true });

			expect(storedTransactions(nativeTokenId)).toBeNull();
		});

		it('should leave the other tokens alone', () => {
			balancesStore.set({ id: splTokenId, data: { data: 5n, certified: false } });

			syncWalletError({ error: 'test error', tokenId: nativeTokenId, hideToast: true });

			expect(get(balancesStore)?.[splTokenId]).toEqual({ data: 5n, certified: false });
			expect(storedTransactions(splTokenId)).toEqual([]);
		});

		it('should log a warning if hideToast is true', () => {
			syncWalletError({ error: 'test error', tokenId: nativeTokenId, hideToast: true });

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

			await syncWalletFromCache({ tokenId: nativeTokenId, networkId: SOLANA_MAINNET_NETWORK_ID });

			expect(storedTransactions(nativeTokenId)).toEqual([
				{ data: derivedRecord, certified: false }
			]);
		});
	});
});
