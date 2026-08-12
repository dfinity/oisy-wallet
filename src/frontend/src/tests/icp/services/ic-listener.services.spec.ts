import { syncWallet } from '$icp/services/ic-listener.services';
import { icTransactionsStatusStore } from '$icp/stores/ic-transactions-status.store';
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
			icTransactionsStatusStore.reset();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should set the balance in balancesStore', async () => {
			vi.useFakeTimers();

			syncWallet({ data: mockPostMessage, tokenId });

			await vi.runAllTimersAsync();

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

			it('should clear an existing streak when the token has no Index canister', () => {
				const mockPostMessageUnavailable: PostMessageDataResponseWallet = {
					wallet: {
						balance: { certified: true, data: mockBalance },
						newTransactions: JSON.stringify([], jsonReplacer),
						transactionsUnavailable: true
					}
				};

				syncWallet({ data: mockPostMessageUnavailable, tokenId });
				syncWallet({ data: mockPostMessageUnavailable, tokenId });

				expect(get(icTransactionsStatusStore)[tokenId]).toBe(2);

				const mockPostMessageNoTransactions: PostMessageDataResponseWallet = {
					wallet: {
						balance: { certified: true, data: mockBalance },
						newTransactions: undefined
					}
				};

				// The token is now permanently without an Index canister: an outage streak is void.
				syncWallet({ data: mockPostMessageNoTransactions, tokenId });

				expect(get(icTransactionsStatusStore)[tokenId]).toBe(0);
			});

			it('should not count a failure when the token has no Index canister', () => {
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

				// Zero, not absent: the token is recorded as checked and not failing. `succeed` writes
				// the zero so that "never checked" stays distinguishable from "checked and fine".
				expect(get(icTransactionsStatusStore)[tokenId]).toBe(0);
			});
		});

		describe('with unavailable transactions', () => {
			const mockPostMessageUnavailable: PostMessageDataResponseWallet = {
				wallet: {
					balance: {
						certified: true,
						data: mockBalance
					},
					newTransactions: JSON.stringify([], jsonReplacer),
					transactionsUnavailable: true
				}
			};

			it('should count each consecutive failure', () => {
				syncWallet({ data: mockPostMessageUnavailable, tokenId });

				expect(get(icTransactionsStatusStore)[tokenId]).toBe(1);

				syncWallet({ data: mockPostMessageUnavailable, tokenId });

				expect(get(icTransactionsStatusStore)[tokenId]).toBe(2);
			});

			it('should reset the count on a successful sync', () => {
				syncWallet({ data: mockPostMessageUnavailable, tokenId });
				syncWallet({ data: mockPostMessageUnavailable, tokenId });

				expect(get(icTransactionsStatusStore)[tokenId]).toBe(2);

				syncWallet({ data: mockPostMessage, tokenId });

				expect(get(icTransactionsStatusStore)[tokenId]).toBe(0);
			});

			it('should keep the transactions already loaded', () => {
				syncWallet({ data: mockPostMessage, tokenId });

				syncWallet({ data: mockPostMessageUnavailable, tokenId });

				expect(get(icTransactionsStore)?.[tokenId]).toEqual(mockCertifiedTransactions);
			});
		});
	});
});
