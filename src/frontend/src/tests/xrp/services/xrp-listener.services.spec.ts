import { balancesStore } from '$lib/stores/balances.store';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { syncWallet, syncWalletError } from '$xrp/services/xrp-listener.services';
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

	describe('syncWalletError', () => {
		it('resets balancesStore on error', () => {
			syncWallet({ data: mockPostMessage({}), tokenId });

			syncWalletError({ error: 'test error', tokenId, hideToast: true });

			expect(get(balancesStore)?.[tokenId]).toBeNull();
		});

		it('resets the transactions store on error', () => {
			syncWallet({ data: mockPostMessage({ transactions: [mockTransaction] }), tokenId });

			syncWalletError({ error: 'test error', tokenId, hideToast: true });

			expect(get(xrpTransactionsStore)?.[tokenId]).toBeNull();
		});

		it('logs a warning when hideToast is true', () => {
			syncWalletError({ error: 'test error', tokenId, hideToast: true });

			expect(console.warn).toHaveBeenCalled();
		});
	});
});
