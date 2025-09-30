import { syncWallet, syncWalletError } from '$btc/services/btc-listener.services';
import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import type { BtcTransactionUi, BtcWalletBalance } from '$btc/types/btc';
import type { BtcPostMessageDataResponseWallet } from '$btc/types/btc-post-message';
import { balancesStore } from '$lib/stores/balances.store';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockBtcTransactionUi } from '$tests/mocks/blockchain-transactions.mock';
import { jsonReplacer } from '@dfinity/utils';
import { get } from 'svelte/store';

// Mock the required dependencies
vi.mock('$btc/services/btc-pending-sent-transactions.services', () => ({
	loadBtcPendingSentTransactions: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('$btc/utils/btc-address.utils', () => ({
	getBtcSourceAddress: vi.fn().mockReturnValue('test-btc-address')
}));

vi.mock('$icp/utils/btc.utils', () => ({
	getBtcWalletBalance: vi.fn().mockReturnValue({ confirmed: 1000n, total: 1000n }),
	mapTokenIdToNetworkId: vi.fn().mockReturnValue('test-network-id')
}));

vi.mock('$lib/derived/auth.derived', () => ({
	authIdentity: {
		subscribe: vi.fn((callback) => {
			callback({ mockIdentity: true });
			return { unsubscribe: vi.fn() };
		})
	}
}));

describe('btc-listener', () => {
	const tokenId: TokenId = parseTokenId('testTokenId');

	const mockBalance: BtcWalletBalance = {
		confirmed: 1000n,
		unconfirmed: 0n,
		locked: 0n,
		total: 1000n
	};

	const mockTransactions = [mockBtcTransactionUi, mockBtcTransactionUi];

	const mockCertifiedTransactions = (transactions: BtcTransactionUi[]) =>
		transactions.map((data) => ({
			data,
			certified: false
		}));

	const mockPostMessage = ({
		balance = mockBalance,
		transactions = mockTransactions,
		certified = false
	}: {
		balance?: BtcWalletBalance | null;
		transactions?: BtcTransactionUi[];
		certified?: boolean;
	}): BtcPostMessageDataResponseWallet => ({
		wallet: {
			balance: {
				certified,
				data: balance
			},
			newTransactions: JSON.stringify(mockCertifiedTransactions(transactions), jsonReplacer)
		}
	});

	beforeEach(() => {
		vi.clearAllMocks();

		balancesStore.reset(tokenId);
		btcTransactionsStore.reset(tokenId);
	});

	describe('syncWallet', () => {
		it('should set the balance in balancesStore', () => {
			syncWallet({ data: mockPostMessage({ certified: false }), tokenId });

			const balance = get(balancesStore);

			expect(balance?.[tokenId]).toEqual({
				data: mockBalance.confirmed,
				certified: false
			});
		});

		it('should set the transactions in btcTransactionsStore', () => {
			syncWallet({ data: mockPostMessage({ certified: false }), tokenId });

			const transactions = get(btcTransactionsStore);

			expect(transactions?.[tokenId]).toEqual(mockCertifiedTransactions(mockTransactions));
		});

		it('should prepend the transactions in btcTransactionsStore', () => {
			syncWallet({ data: mockPostMessage({ certified: false }), tokenId });

			const transactionsToPrepend = [...mockTransactions, ...mockTransactions];

			const mockMorePostMessage: BtcPostMessageDataResponseWallet = mockPostMessage({
				transactions: transactionsToPrepend,
				certified: false
			});

			syncWallet({ data: mockMorePostMessage, tokenId });

			const transactions = get(btcTransactionsStore);

			expect(transactions?.[tokenId]).toEqual(mockCertifiedTransactions(transactionsToPrepend));
		});

		it('should reset balanceStore if balance is empty', () => {
			syncWallet({
				data: mockPostMessage({ balance: null, certified: false }),
				tokenId
			});

			const balance = get(balancesStore);

			expect(balance?.[tokenId]).toBeNull();
		});
	});

	describe('syncWalletError', () => {
		it('should reset balanceStore and btcTransactionsStore on error', () => {
			syncWallet({ data: mockPostMessage({ certified: false }), tokenId });

			syncWalletError({ error: 'test', tokenId, hideToast: true });

			const balance = get(balancesStore);
			const transactions = get(btcTransactionsStore);

			// The console.warn call count depends on how many times getPendingTransactionsBalance is called
			// and how many console.warn statements are in that function
			expect(console.warn).toHaveBeenCalled();
			expect(balance?.[tokenId]).toBeNull();
			expect(transactions?.[tokenId]).toBeNull();
		});
	});
});
