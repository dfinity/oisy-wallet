import { RLUSD_TOKEN_ID } from '$env/tokens/tokens-xrp/tokens.rlusd.env';
import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { ZERO } from '$lib/constants/app.constants';
import { balancesStore } from '$lib/stores/balances.store';
import type { TokenId } from '$lib/types/token';
import { areTransactionsStoresLoaded } from '$lib/utils/transactions.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockRlusdCurrencyCode, mockRlusdIssuer, mockXrpTrustLine } from '$tests/mocks/xrp.mock';
import * as xrpHistoryPager from '$xrp/services/xrp-history-pager.services';
import { resetWallet, syncWallet, syncWalletError } from '$xrp/services/xrp-listener.services';
import { xrpTransactionsStore } from '$xrp/stores/xrp-transactions.store';
import { xrpTrustLinesStore } from '$xrp/stores/xrp-trust-lines.store';
import type { XrpBalance } from '$xrp/types/xrp-balance';
import type { XrpPostMessageDataResponseWallet } from '$xrp/types/xrp-post-message';
import type { XrpTransactionUi } from '$xrp/types/xrp-transaction';
import type { XrpTrustLine } from '$xrp/types/xrp-trust-line';
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

		// The pager's marker points below the rows just cleared: resuming from it would leave out
		// everything between the first page synced next and where the pager had got to.
		it('drops the history pager, so that paging starts from the newest transaction again', () => {
			const spyResetPager = vi.spyOn(xrpHistoryPager, 'resetXrpHistoryPager');

			resetWallet({ tokenId });

			expect(spyResetPager).toHaveBeenCalledExactlyOnceWith(tokenId);
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

		// Absent history is not an empty page — writing `[]` would report the account as having no
		// activity on the strength of a request that failed. `null` is not that: it records that the
		// read was attempted and produced nothing to show, which is what settles the aggregate gate.
		//
		// The scheduler folds an `account_tx` rejection into `undefined` and posts a normal wallet
		// update, so `syncWalletError` never runs on this path and, left unwritten, a healthy balance
		// with a failing history held the gate open for good with nothing reported.
		it('settles a never-loaded entry when a sync carries no history', () => {
			const gate = () =>
				areTransactionsStoresLoaded([
					{ transactionsStoreData: get(xrpTransactionsStore), tokens: [XRP_TOKEN] }
				]);

			resetWallet({ tokenId: XRP_TOKEN.id });

			expect(gate()).toBeFalsy();

			const { wallet } = mockPostMessage({});

			syncWallet({
				data: { wallet: { balance: wallet.balance } },
				tokenId: XRP_TOKEN.id
			});

			expect(get(xrpTransactionsStore)?.[XRP_TOKEN.id]).toBeNull();
			expect(get(xrpTransactionsStore)?.[XRP_TOKEN.id]).not.toEqual([]);
			expect(gate()).toBeTruthy();
		});

		// The other half, as on the error path: settling must not cost rows that did load.
		it('keeps loaded rows when a later sync carries no history', () => {
			syncWallet({ data: mockPostMessage({ transactions: [mockTransaction] }), tokenId });

			const { wallet } = mockPostMessage({});

			syncWallet({
				data: { wallet: { balance: wallet.balance } },
				tokenId
			});

			expect(get(xrpTransactionsStore)?.[tokenId]).toHaveLength(1);
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

	describe('trust lines', () => {
		const nativeTokenId = XRP_TOKEN.id;

		const withLines = (trustLines?: XrpTrustLine[]): XrpPostMessageDataResponseWallet => ({
			wallet: {
				balance: { certified: false, data: mockBalance },
				...(trustLines !== undefined && { trustLines })
			}
		});

		const balanceOf = (id: TokenId) => get(balancesStore)?.[id];

		const heldBalance = { data: 125n * 10n ** 17n, certified: false };

		// Real timers: `batchSet` flushes on the next frame, and a frame an earlier test scheduled
		// under real timers cannot be advanced by fake ones — writes would queue behind it unseen.
		beforeEach(() => {
			vi.useRealTimers();
			resetWallet({ tokenId: nativeTokenId });
			balancesStore.reset(RLUSD_TOKEN_ID);
		});

		it('writes the lines and the balance of each held token', async () => {
			syncWallet({ data: withLines([mockXrpTrustLine]), tokenId: nativeTokenId });

			expect(get(xrpTrustLinesStore)[nativeTokenId]).toEqual([mockXrpTrustLine]);

			await vi.waitFor(() => expect(balanceOf(RLUSD_TOKEN_ID)).toEqual(heldBalance));
		});

		// A negative balance is the side that is owed — an issuer's position. The wallet holds none.
		it('shows a negative line balance as zero', async () => {
			syncWallet({
				data: withLines([{ ...mockXrpTrustLine, balance: '-3' }]),
				tokenId: nativeTokenId
			});

			await vi.waitFor(() =>
				expect(balanceOf(RLUSD_TOKEN_ID)).toEqual({ data: ZERO, certified: false })
			);
		});

		it('resets the balance of a token whose line is gone', async () => {
			syncWallet({ data: withLines([mockXrpTrustLine]), tokenId: nativeTokenId });
			await vi.waitFor(() => expect(balanceOf(RLUSD_TOKEN_ID)).toEqual(heldBalance));

			syncWallet({ data: withLines([]), tokenId: nativeTokenId });

			expect(get(xrpTrustLinesStore)[nativeTokenId]).toEqual([]);
			expect(balanceOf(RLUSD_TOKEN_ID)).toBeNull();
		});

		it('keeps the lines it holds when a sync carries none', async () => {
			syncWallet({ data: withLines([mockXrpTrustLine]), tokenId: nativeTokenId });
			await vi.waitFor(() => expect(balanceOf(RLUSD_TOKEN_ID)).toEqual(heldBalance));

			syncWallet({ data: withLines(), tokenId: nativeTokenId });

			expect(get(xrpTrustLinesStore)[nativeTokenId]).toEqual([mockXrpTrustLine]);
			expect(balanceOf(RLUSD_TOKEN_ID)).toEqual(heldBalance);
		});

		it('drops the lines and their balances on a handover', async () => {
			syncWallet({ data: withLines([mockXrpTrustLine]), tokenId: nativeTokenId });
			await vi.waitFor(() => expect(balanceOf(RLUSD_TOKEN_ID)).toEqual(heldBalance));

			resetWallet({ tokenId: nativeTokenId });

			expect(get(xrpTrustLinesStore)[nativeTokenId]).toBeUndefined();
			expect(balanceOf(RLUSD_TOKEN_ID)).toBeNull();
		});

		// The tokens' history comes from the pages the account's is read from.
		describe("the tokens' history", () => {
			const tokenRow: XrpTransactionUi = { ...mockTransaction, id: 'TOKEN_HASH' };

			const withHistory = ({
				trustLines,
				transactions = [],
				tokenRows
			}: {
				trustLines?: XrpTrustLine[];
				transactions?: XrpTransactionUi[] | null;
				tokenRows?: { currency: string; issuer: string; transaction: XrpTransactionUi }[];
			}): XrpPostMessageDataResponseWallet => ({
				wallet: {
					balance: { certified: false, data: mockBalance },
					...(trustLines !== undefined && { trustLines }),
					...(transactions !== null && {
						newTransactions: JSON.stringify(
							transactions.map((data) => ({ data, certified: false })),
							jsonReplacer
						)
					}),
					...(tokenRows !== undefined && {
						newTrustLineTransactions: JSON.stringify(
							tokenRows.map(({ transaction, ...identity }) => ({
								...identity,
								transaction: { data: transaction, certified: false }
							})),
							jsonReplacer
						)
					})
				}
			});

			const rlusdRow = {
				currency: mockRlusdCurrencyCode,
				issuer: mockRlusdIssuer,
				transaction: tokenRow
			};

			const historyOf = (id: TokenId) => get(xrpTransactionsStore)?.[id];

			beforeEach(() => {
				xrpTransactionsStore.clear(nativeTokenId);
				xrpTransactionsStore.clear(RLUSD_TOKEN_ID);
			});

			it("files a row under its token, not under XRP's", () => {
				syncWallet({
					data: withHistory({ trustLines: [mockXrpTrustLine], tokenRows: [rlusdRow] }),
					tokenId: nativeTokenId
				});

				expect(historyOf(RLUSD_TOKEN_ID)).toEqual([{ data: tokenRow, certified: false }]);
				expect(historyOf(nativeTokenId)).toEqual([]);
			});

			// A row of a line the account no longer has would otherwise wait in the store.
			it('drops a row of a token the account does not hold', () => {
				syncWallet({
					data: withHistory({ trustLines: [], tokenRows: [rlusdRow] }),
					tokenId: nativeTokenId
				});

				expect(historyOf(RLUSD_TOKEN_ID)).toBeUndefined();
			});

			// Read, and none of its payments found: its page shows that rather than loading for good.
			it("settles a held token's history once the account's is read", () => {
				syncWallet({
					data: withHistory({ trustLines: [mockXrpTrustLine], tokenRows: [] }),
					tokenId: nativeTokenId
				});

				expect(historyOf(RLUSD_TOKEN_ID)).toEqual([]);
			});

			it('settles a token added after the history was read', () => {
				syncWallet({ data: withHistory({ trustLines: [] }), tokenId: nativeTokenId });

				syncWallet({
					data: withHistory({ trustLines: [mockXrpTrustLine], transactions: null }),
					tokenId: nativeTokenId
				});

				expect(historyOf(RLUSD_TOKEN_ID)).toEqual([]);
			});

			it("records a failed first read for a held token as the account's", () => {
				syncWallet({
					data: withHistory({ trustLines: [mockXrpTrustLine], transactions: null }),
					tokenId: nativeTokenId
				});

				expect(historyOf(nativeTokenId)).toBeNull();
				expect(historyOf(RLUSD_TOKEN_ID)).toBeNull();
			});

			it('records the failure on a balance error too', () => {
				syncWallet({ data: withLines([mockXrpTrustLine]), tokenId: nativeTokenId });

				xrpTransactionsStore.clear(nativeTokenId);
				xrpTransactionsStore.clear(RLUSD_TOKEN_ID);

				syncWalletError({ tokenId: nativeTokenId, error: new Error('down'), hideToast: true });

				expect(historyOf(RLUSD_TOKEN_ID)).toBeNull();
			});

			it('keeps the rows a held token has', () => {
				syncWallet({
					data: withHistory({ trustLines: [mockXrpTrustLine], tokenRows: [rlusdRow] }),
					tokenId: nativeTokenId
				});

				syncWallet({ data: withHistory({ tokenRows: [] }), tokenId: nativeTokenId });

				expect(historyOf(RLUSD_TOKEN_ID)).toEqual([{ data: tokenRow, certified: false }]);
			});

			it("drops a token's history and pager with its line", () => {
				const reset = vi.spyOn(xrpHistoryPager, 'resetXrpHistoryPager');

				syncWallet({
					data: withHistory({ trustLines: [mockXrpTrustLine], tokenRows: [rlusdRow] }),
					tokenId: nativeTokenId
				});

				syncWallet({ data: withHistory({ trustLines: [] }), tokenId: nativeTokenId });

				expect(historyOf(RLUSD_TOKEN_ID)).toBeUndefined();
				expect(reset).toHaveBeenCalledWith(RLUSD_TOKEN_ID);
			});

			it("drops the held tokens' history and pagers on a handover", () => {
				const reset = vi.spyOn(xrpHistoryPager, 'resetXrpHistoryPager');

				syncWallet({
					data: withHistory({ trustLines: [mockXrpTrustLine], tokenRows: [rlusdRow] }),
					tokenId: nativeTokenId
				});

				resetWallet({ tokenId: nativeTokenId });

				expect(historyOf(RLUSD_TOKEN_ID)).toBeUndefined();
				expect(reset).toHaveBeenCalledWith(RLUSD_TOKEN_ID);
			});
		});
	});
});
