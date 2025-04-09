import { syncWallet } from '$icp/services/ic-listener.services';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import { balancesStore } from '$lib/stores/balances.store';
import type { PostMessageDataResponseWallet } from '$lib/types/post-message';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { createCertifiedIcTransactionUiMock } from '$tests/utils/transactions-stores.test-utils';
import { jsonReplacer } from '@dfinity/utils';
import { get } from 'svelte/store';

describe('ic-listener', () => {
	describe('syncWallet', () => {
		const tokenId: TokenId = parseTokenId('test');

		const mockBalance = 1256n;

		const mockTransactions = [
			createCertifiedIcTransactionUiMock('tx1'),
			createCertifiedIcTransactionUiMock('tx2')
		];

		const mockCertifiedTransactions = mockTransactions.map((data, i) => ({
			data,
			certified: i % 2 === 0
		}));

		const mockPostMessage: PostMessageDataResponseWallet = {
			wallet: {
				balance: {
					certified: true,
					data: mockBalance
				},
				newTransactions: JSON.stringify(mockCertifiedTransactions, jsonReplacer)
			}
		};

		beforeEach(() => {
			vi.clearAllMocks();

			balancesStore.reset(tokenId);
			icTransactionsStore.reset(tokenId);
		});

		it('should set the balance in balancesStore', () => {
			syncWallet({ data: mockPostMessage, tokenId });

			const balance = get(balancesStore);

			expect(balance?.[tokenId]).toEqual({
				data: mockBalance,
				certified: true
			});
		});

		describe('with transactions', () => {
			it('should set the transactions in icTransactionsStore', () => {
				syncWallet({ data: mockPostMessage, tokenId });

				const transactions = get(icTransactionsStore);

				expect(transactions?.[tokenId]).toEqual(mockCertifiedTransactions);
			});

			it('should prepend the transactions in icTransactionsStore', () => {
				syncWallet({ data: mockPostMessage, tokenId });

				const mockMoreCertifiedTransactions = mockTransactions.map((data, i) => ({
					data: {
						...data,
						id: `more-tx${i}`
					},
					certified: i % 2 === 0
				}));

				const mockMorePostMessage: PostMessageDataResponseWallet = {
					wallet: {
						balance: {
							certified: true,
							data: mockBalance
						},
						newTransactions: JSON.stringify(mockMoreCertifiedTransactions, jsonReplacer)
					}
				};

				syncWallet({ data: mockMorePostMessage, tokenId });

				const transactions = get(icTransactionsStore);

				expect(transactions?.[tokenId]).toEqual([
					...mockMoreCertifiedTransactions,
					...mockCertifiedTransactions
				]);
			});
		});

		describe('without transactions', () => {
			it('should nullify the transactions of icTransactionsStore if newTransactions undefined', () => {
				const mockPostMessage: PostMessageDataResponseWallet = {
					wallet: {
						balance: {
							certified: true,
							data: mockBalance
						},
						newTransactions: undefined
					}
				};

				syncWallet({ data: mockPostMessage, tokenId });

				const transactions = get(icTransactionsStore);

				expect(transactions?.[tokenId]).toBeNull();
			});

			it('should nullify the transactions of icTransactionsStore if newTransactions is not provided', () => {
				const mockPostMessage: PostMessageDataResponseWallet = {
					wallet: {
						balance: {
							certified: true,
							data: mockBalance
						}
					}
				};

				syncWallet({ data: mockPostMessage, tokenId });

				const transactions = get(icTransactionsStore);

				expect(transactions?.[tokenId]).toBeNull();
			});

			it('should nullify the transactions of icTransactionsStore even if there were transactions in store', () => {
				syncWallet({ data: mockPostMessage, tokenId });

				const transactions = get(icTransactionsStore);

				expect(transactions?.[tokenId]).toEqual(mockCertifiedTransactions);

				const mockPostMessageNoTransactions: PostMessageDataResponseWallet = {
					wallet: {
						balance: {
							certified: true,
							data: mockBalance
						},
						newTransactions: undefined
					}
				};

				syncWallet({ data: mockPostMessageNoTransactions, tokenId });

				const transactionsNull = get(icTransactionsStore);

				expect(transactionsNull?.[tokenId]).toBeNull();
			});
		});
	});
});
