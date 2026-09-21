import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { balancesStore } from '$lib/stores/balances.store';
import type { TokenId } from '$lib/types/token';
import { areTransactionsStoresLoaded } from '$lib/utils/transactions.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { resetWallet, syncWallet, syncWalletError } from '$xrp/services/xrp-listener.services';
import { xrpTransactionsStore } from '$xrp/stores/xrp-transactions.store';
import type { XrpBalance } from '$xrp/types/xrp-balance';
import type { XrpPostMessageDataResponseWallet } from '$xrp/types/xrp-post-message';
import type { XrpTransactionUi } from '$xrp/types/xrp-transaction';
import { jsonReplacer } from '@dfinity/utils';
import { get } from 'svelte/store';

describe('xrp-listener.services', () => {
	const tokenId: TokenId = parseTokenId('testXrpTokenId');
	const mockBalance = 25_000_000n;

	const mockTransaction: XrpTransactionUi = {
		id: 'HASH1',
		type: 'receive',
		status: 'confirmed',
		value: 5_000_000n,
		from: 'rSender',
		to: 'rReceiver',
		timestamp: 1n
	};

	const mockPostMessage = ({
		balance = mockBalance,
		transactions = []
	}: {
		balance?: XrpBalance | null;
		transactions?: XrpTransactionUi[];
	}): XrpPostMessageDataResponseWallet => ({
		wallet: {
			balance: {
				certified: true,
				data: balance
			},
			newTransactions: JSON.stringify(
				transactions.map((data) => ({ data, certified: false })),
				jsonReplacer
			)
		}
	});

	beforeEach(() => {
		vi.clearAllMocks();
		balancesStore.reset(tokenId);
		xrpTransactionsStore.reset(tokenId);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('syncWallet', () => {
		it('sets the balance in balancesStore', async () => {
			vi.useFakeTimers();

			syncWallet({ data: mockPostMessage({}), tokenId });

			await vi.runAllTimersAsync();

			expect(get(balancesStore)?.[tokenId]).toEqual({
				data: mockBalance,
				certified: true
			});
		});

		it('resets balancesStore when the balance is empty', () => {
			syncWallet({ data: mockPostMessage({ balance: null }), tokenId });

			expect(get(balancesStore)?.[tokenId]).toBeNull();
		});

		it('prepends the new transactions to the transactions store', () => {
			syncWallet({ data: mockPostMessage({ transactions: [mockTransaction] }), tokenId });

			expect(get(xrpTransactionsStore)?.[tokenId]).toEqual([
				{ data: mockTransaction, certified: false }
			]);
		});
	});

	describe('resetWallet', () => {
		// Called when the worker observes a new address. `syncWallet` prepends, so without this the
		// first page synced for the new address merges into the previous address's rows.
		// `undefined`, not `null`. An ownership handover means nobody has asked about this account
		// yet, and `isTransactionsStoreInitialized` counts anything other than `undefined` as
		// initialized — so `null` here would make the activity view drop its skeleton and report an
		// empty history before the first request had even been sent.
		it('clears both stores so a later sync starts from nothing', () => {
			syncWallet({ data: mockPostMessage({ transactions: [mockTransaction] }), tokenId });

			expect(get(xrpTransactionsStore)?.[tokenId]).toHaveLength(1);

			resetWallet({ tokenId });

			expect(get(xrpTransactionsStore)?.[tokenId]).toBeUndefined();
			expect(get(balancesStore)?.[tokenId]).toBeNull();
		});

		// A failure is not a handover. A failure leaves loaded rows in place — `syncWalletError`
		// writes only the never-loaded case, to settle the aggregate gate — while a handover drops
		// them to `undefined`, because they belong to the previous account.
		// A handover clears the history because it belongs to the previous account. A failure does
		// not: the rows loaded correctly and stay true, and the scheduler passes no marker, so
		// anything older than the newest page would never be fetched again.
		it('keeps a failure distinguishable from a handover', () => {
			syncWallet({ data: mockPostMessage({ transactions: [mockTransaction] }), tokenId });

			syncWalletError({ tokenId, error: new Error('account_info down'), hideToast: true });

			expect(get(xrpTransactionsStore)?.[tokenId]).toHaveLength(1);

			resetWallet({ tokenId });

			expect(get(xrpTransactionsStore)?.[tokenId]).toBeUndefined();
		});

		// Absent history is not an empty page. Writing anything would mark the store initialized and
		// report the account as having no activity on the strength of a request that failed.
		it('leaves the store untouched when a sync carries no history', () => {
			resetWallet({ tokenId });

			const { wallet } = mockPostMessage({});

			syncWallet({
				data: { wallet: { balance: wallet.balance } },
				tokenId
			});

			expect(get(xrpTransactionsStore)?.[tokenId]).toBeUndefined();
		});

		it('leaves a later sync holding only the new rows', () => {
			syncWallet({ data: mockPostMessage({ transactions: [mockTransaction] }), tokenId });

			resetWallet({ tokenId });

			const newTransaction = { ...mockTransaction, id: 'HASH2' };
			syncWallet({ data: mockPostMessage({ transactions: [newTransaction] }), tokenId });

			expect(get(xrpTransactionsStore)?.[tokenId]).toHaveLength(1);
			expect(get(xrpTransactionsStore)?.[tokenId]?.[0].data.id).toBe('HASH2');
		});
	});

	describe('syncWalletError', () => {
		it('resets balancesStore on error', () => {
			syncWallet({ data: mockPostMessage({}), tokenId });

			syncWalletError({ error: 'test error', tokenId, hideToast: true });

			expect(get(balancesStore)?.[tokenId]).toBeNull();
		});

		// The balance only. This path means `account_info` failed — the scheduler absorbs an
		// `account_tx` failure — so history that loaded correctly has no reason to go, and losing
		// it is unrecoverable: only the newest page is ever refetched.
		it('resets the balance on error and keeps the history', () => {
			syncWallet({ data: mockPostMessage({ transactions: [mockTransaction] }), tokenId });

			syncWalletError({ error: 'test error', tokenId, hideToast: true });

			expect(get(balancesStore)?.[tokenId]).toBeNull();
			expect(get(xrpTransactionsStore)?.[tokenId]).toHaveLength(1);
		});

		// `resetWallet` leaves the entry `undefined` on every worker start, and the aggregate Activity
		// gate counts anything that is not `undefined` as initialized — so a token whose FIRST load
		// never succeeded held that gate open for good: an otherwise-empty account stayed on
		// skeletons and `levelNewcomers` never ran. A provider outage on first load is enough.
		it('settles a never-loaded entry so the aggregate gate can close', () => {
			const gate = () =>
				areTransactionsStoresLoaded([
					{ transactionsStoreData: get(xrpTransactionsStore), tokens: [XRP_TOKEN] }
				]);

			resetWallet({ tokenId: XRP_TOKEN.id });

			expect(gate()).toBeFalsy();

			syncWalletError({ error: 'test error', tokenId: XRP_TOKEN.id, hideToast: true });

			expect(get(xrpTransactionsStore)?.[XRP_TOKEN.id]).toBeNull();
			expect(gate()).toBeTruthy();
		});

		// The other half: settling must not cost rows that did load, which is why this is not the
		// unconditional `reset`/`nullify` the other chains do.
		it('leaves a loaded entry alone', () => {
			syncWallet({ data: mockPostMessage({ transactions: [mockTransaction] }), tokenId });

			syncWalletError({ error: 'test error', tokenId, hideToast: true });

			expect(get(xrpTransactionsStore)?.[tokenId]).toHaveLength(1);
		});

		it('logs a warning when hideToast is true', () => {
			syncWalletError({ error: 'test error', tokenId, hideToast: true });

			expect(console.warn).toHaveBeenCalled();
		});
	});
});
