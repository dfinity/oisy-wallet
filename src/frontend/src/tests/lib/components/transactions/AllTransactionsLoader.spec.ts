import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import type { BtcTransactionUi } from '$btc/types/btc';
import { BASE_SEPOLIA_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { BNB_MAINNET_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens.bnb.env';
import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import * as icTransactionsServices from '$icp/services/ic-transactions.services';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import { icrcCustomTokensStore } from '$icp/stores/icrc-custom-tokens.store';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { normalizeTimestampToSeconds } from '$icp/utils/date.utils';
import AllTransactionsLoader from '$lib/components/transactions/AllTransactionsLoader.svelte';
import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import type { Token } from '$lib/types/token';
import type { AllTransactionUiWithCmp, Transaction } from '$lib/types/transaction';
import * as transactionsUtils from '$lib/utils/transactions.utils';
import * as solTransactionsServices from '$sol/services/sol-transactions.services';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import { splCustomTokensStore } from '$sol/stores/spl-custom-tokens.store';
import { splDefaultTokensStore } from '$sol/stores/spl-default-tokens.store';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { createMockBtcTransactionsUi } from '$tests/mocks/blockchain-transactions.mock';
import { createMockEthTransactionsUi } from '$tests/mocks/eth-transactions.mock';
import { createMockIcTransactionsUi } from '$tests/mocks/ic-transactions.mock';
import { mockIcrcCustomToken } from '$tests/mocks/icrc-custom-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { createMockSolTransactionsUi } from '$tests/mocks/sol-transactions.mock';
import { mockSplCustomToken } from '$tests/mocks/spl-tokens.mock';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { nonNullish } from '@dfinity/utils';
import { render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

vi.mock('$icp/services/ic-transactions.services', () => ({
	loadNextIcTransactionsByOldest: vi.fn()
}));

vi.mock('$sol/services/sol-transactions.services', () => ({
	loadNextSolTransactionsByOldest: vi.fn()
}));

describe('AllTransactionsLoader', () => {
	let spyLoadNextIcTransactions: MockInstance;
	let spyLoadNextSolTransactions: MockInstance;

	const mockMinTimestampStart = 1_000_000_000n;
	const timestampBuffer = mockMinTimestampStart + 500_000_000n;
	const mockMaxTimestamp = timestampBuffer + 200_000_000n;

	// Oldest transactions
	const btcTransactions: AllTransactionUiWithCmp[] = [
		...createMockBtcTransactionsUi(3).map((transaction, index) => ({
			transaction: { ...transaction, timestamp: mockMinTimestampStart + 1n + BigInt(index) },
			component: 'bitcoin' as const,
			token: BTC_MAINNET_TOKEN
		})),
		...createMockBtcTransactionsUi(4).map((transaction, index) => ({
			transaction: { ...transaction, timestamp: mockMinTimestampStart + 2n + BigInt(index) },
			component: 'bitcoin' as const,
			token: BTC_TESTNET_TOKEN
		}))
	];

	// Newest transactions
	const ethTransactions: AllTransactionUiWithCmp[] = [
		...createMockEthTransactionsUi(5).map((transaction, index) => ({
			transaction: { ...transaction, timestamp: Number(mockMaxTimestamp) + index },
			component: 'ethereum' as const,
			token: ETHEREUM_TOKEN
		})),
		...createMockEthTransactionsUi(6).map((transaction, index) => ({
			transaction: { ...transaction, timestamp: Number(mockMaxTimestamp) * 2 + index },
			component: 'ethereum' as const,
			token: BNB_MAINNET_TOKEN
		})),
		...createMockEthTransactionsUi(7).map((transaction, index) => ({
			transaction: { ...transaction, timestamp: Number(mockMaxTimestamp) * 3 + index },
			component: 'ethereum' as const,
			token: BASE_SEPOLIA_ETH_TOKEN
		}))
	];

	// Transactions to be checked for IC tokens
	const mockIcToken = { ...mockIcrcCustomToken, enabled: true };
	const icTokens: [Token, number, bigint][] = [
		[ICP_TOKEN, 8, timestampBuffer + 100n],
		[mockIcToken, 9, timestampBuffer + 200n]
	];
	const icTransactions: AllTransactionUiWithCmp[] = icTokens.reduce<AllTransactionUiWithCmp[]>(
		(acc, [token, n, buffer]) => {
			const transactions = createMockIcTransactionsUi(n).map((transaction, index) => ({
				transaction: { ...transaction, timestamp: buffer + BigInt(index) },
				component: 'ic' as const,
				token
			}));
			return [...acc, ...transactions];
		},
		[]
	);

	// Transactions to be checked for Solana tokens
	const mockSplToken = { ...mockSplCustomToken, enabled: true };
	const mockSplDefaultToken = { ...BONK_TOKEN, enabled: true };
	const solTokens: [Token, number, bigint][] = [
		[SOLANA_TOKEN, 10, timestampBuffer + 300n],
		[mockSplDefaultToken, 11, timestampBuffer + 400n],
		[mockSplToken, 12, timestampBuffer + 500n]
	];
	const solTransactions: AllTransactionUiWithCmp[] = solTokens.reduce<AllTransactionUiWithCmp[]>(
		(acc, [token, n, buffer]) => {
			const transactions = createMockSolTransactionsUi(n).map((transaction, index) => ({
				transaction: { ...transaction, timestamp: buffer + BigInt(index) },
				component: 'solana' as const,
				token
			}));
			return [...acc, ...transactions];
		},
		[]
	);

	const mockTransactions: AllTransactionUiWithCmp[] = [
		...btcTransactions,
		...ethTransactions,
		...icTransactions,
		...solTransactions
	];

	const mockMinTimestamp = Math.min(
		...mockTransactions.map(({ transaction }) =>
			nonNullish(transaction.timestamp)
				? normalizeTimestampToSeconds(transaction.timestamp)
				: Infinity
		)
	);

	const props = { transactions: mockTransactions };

	beforeEach(() => {
		vi.clearAllMocks();

		mockAuthStore();

		setupTestnetsStore('enabled');
		setupUserNetworksStore('allEnabled');

		vi.spyOn(transactionsUtils, 'areTransactionsStoresLoaded').mockReturnValue(true);

		spyLoadNextIcTransactions = vi.spyOn(icTransactionsServices, 'loadNextIcTransactionsByOldest');
		spyLoadNextSolTransactions = vi.spyOn(
			solTransactionsServices,
			'loadNextSolTransactionsByOldest'
		);

		spyLoadNextIcTransactions.mockImplementation(
			async ({ signalEnd }: { signalEnd: () => void }) => {
				signalEnd();
				return await Promise.resolve({ success: true });
			}
		);

		spyLoadNextSolTransactions.mockImplementation(
			async ({ signalEnd }: { signalEnd: () => void }) => {
				signalEnd();
				return await Promise.resolve({ success: true });
			}
		);

		icrcCustomTokensStore.resetAll();
		icrcCustomTokensStore.setAll([{ data: mockIcToken, certified: false }]);

		splDefaultTokensStore.reset();
		splDefaultTokensStore.add(BONK_TOKEN);
		splCustomTokensStore.resetAll();
		splCustomTokensStore.setAll([
			{ data: mockSplToken, certified: false },
			{ data: mockSplDefaultToken, certified: false }
		]);

		btcTransactions.forEach(({ token: { id: tokenId } }) => {
			btcTransactionsStore.reset(tokenId);
		});
		btcTransactions.forEach(({ transaction, token: { id: tokenId } }) => {
			btcTransactionsStore.append({
				tokenId,
				transactions: [{ data: transaction as BtcTransactionUi, certified: false }]
			});
		});

		ethTransactions.forEach(({ token: { id: tokenId } }) => {
			ethTransactionsStore.nullify(tokenId);
		});
		ethTransactions.forEach(({ transaction, token: { id: tokenId } }) => {
			ethTransactionsStore.add({
				tokenId,
				transactions: [{ data: transaction as Transaction, certified: false }]
			});
		});

		icTransactions.forEach(({ token: { id: tokenId } }) => {
			icTransactionsStore.reset(tokenId);
		});
		icTransactions.forEach(({ transaction, token: { id: tokenId } }) => {
			icTransactionsStore.append({
				tokenId,
				transactions: [{ data: transaction as IcTransactionUi, certified: false }]
			});
		});

		solTransactions.forEach(({ token: { id: tokenId } }) => {
			solTransactionsStore.reset(tokenId);
		});
		solTransactions.forEach(({ transaction, token: { id: tokenId } }) => {
			solTransactionsStore.append({
				tokenId,
				transactions: [{ data: transaction as SolTransactionUi, certified: false }]
			});
		});
	});

	it('should not load transactions if transactions store are not loaded', () => {
		vi.spyOn(transactionsUtils, 'areTransactionsStoresLoaded').mockReturnValue(false);

		render(AllTransactionsLoader, { props: { transactions: [] } });

		expect(spyLoadNextIcTransactions).not.toHaveBeenCalled();
		expect(spyLoadNextSolTransactions).not.toHaveBeenCalled();
	});

	it('should not load transactions if identity is nullish', () => {
		mockAuthStore(null);

		render(AllTransactionsLoader, { props });

		expect(spyLoadNextIcTransactions).not.toHaveBeenCalled();
		expect(spyLoadNextSolTransactions).not.toHaveBeenCalled();
	});

	it('should not load transactions if transactions are empty', () => {
		render(AllTransactionsLoader, { props: { transactions: [] } });

		expect(spyLoadNextIcTransactions).not.toHaveBeenCalled();
		expect(spyLoadNextSolTransactions).not.toHaveBeenCalled();
	});

	describe('when there are no enabled tokens', () => {
		beforeEach(() => {
			setupTestnetsStore('disabled');
			setupUserNetworksStore('allDisabled');
		});

		it('should load transactions only for IC tokens if it is not the minimum', () => {
			render(AllTransactionsLoader, { props });

			expect(spyLoadNextIcTransactions).toHaveBeenCalledTimes(icTokens.length);

			icTokens.forEach(([token]) => {
				const transactions = (get(icTransactionsStore)?.[token.id] ?? []).map(
					({ data: transaction }) => transaction
				);

				expect(spyLoadNextIcTransactions).toHaveBeenCalledWith({
					minTimestamp: mockMinTimestamp,
					transactions,
					owner: mockIdentity.getPrincipal(),
					identity: mockIdentity,
					maxResults: WALLET_PAGINATION,
					token,
					signalEnd: expect.any(Function)
				});
			});

			expect(spyLoadNextSolTransactions).not.toHaveBeenCalled();
		});
	});

	describe('with IC tokens', () => {
		it('should load transactions with the correct service', () => {
			render(AllTransactionsLoader, { props });

			expect(spyLoadNextIcTransactions).toHaveBeenCalledTimes(icTokens.length);

			icTokens.forEach(([token]) => {
				const transactions = (get(icTransactionsStore)?.[token.id] ?? []).map(
					({ data: transaction }) => transaction
				);

				expect(spyLoadNextIcTransactions).toHaveBeenCalledWith({
					minTimestamp: mockMinTimestamp,
					transactions,
					owner: mockIdentity.getPrincipal(),
					identity: mockIdentity,
					maxResults: WALLET_PAGINATION,
					token,
					signalEnd: expect.any(Function)
				});
			});
		});

		it('should not keep loading transactions if the service returns a falsy success', () => {
			spyLoadNextIcTransactions.mockResolvedValue({ success: false });

			render(AllTransactionsLoader, { props });

			expect(spyLoadNextIcTransactions).toHaveBeenCalledTimes(icTokens.length);

			icTokens.forEach(([token]) => {
				const transactions = (get(icTransactionsStore)?.[token.id] ?? []).map(
					({ data: transaction }) => transaction
				);

				expect(spyLoadNextIcTransactions).toHaveBeenCalledWith({
					minTimestamp: mockMinTimestamp,
					transactions,
					owner: mockIdentity.getPrincipal(),
					identity: mockIdentity,
					maxResults: WALLET_PAGINATION,
					token,
					signalEnd: expect.any(Function)
				});
			});
		});

		it('should keep loading transactions if the timestamp is still not the minimum', async () => {
			let counter = 0;

			spyLoadNextIcTransactions.mockImplementation(async () => {
				if (Math.random() > 0.3 || counter < 10) {
					counter++;
					return await Promise.resolve({ success: true });
				}
				return await Promise.resolve({ success: false });
			});

			render(AllTransactionsLoader, { props });

			await waitFor(() => {
				expect(spyLoadNextIcTransactions).toHaveBeenCalledTimes(icTokens.length + counter);
			});
		});

		it('should keep loading transactions until there are not more transactions', async () => {
			let counter = 0;

			spyLoadNextIcTransactions.mockImplementation(
				async ({ signalEnd }: { signalEnd: () => void }) => {
					if (Math.random() > 0.3 || counter < 10) {
						counter++;
					} else {
						signalEnd();
					}
					return await Promise.resolve({ success: true });
				}
			);

			render(AllTransactionsLoader, { props });

			await waitFor(() => {
				expect(spyLoadNextIcTransactions).toHaveBeenCalledTimes(icTokens.length + counter);
			});
		});

		it('should not go into a recursive loop that finishes only when there are no more transactions', async () => {
			let counter = 0;

			const newTransaction: IcTransactionUi = {
				...createMockIcTransactionsUi(1)[0],
				timestamp: mockMinTimestampStart + 1n
			};

			spyLoadNextIcTransactions.mockImplementation(
				async ({ signalEnd }: { signalEnd: () => void }) => {
					if (Math.random() > 0.3 || counter < 10) {
						icTokens.forEach(([{ id: tokenId }]) => {
							icTransactionsStore.append({
								tokenId,
								transactions: [{ data: newTransaction, certified: false }]
							});
						});
						counter++;
					} else {
						signalEnd();
					}
					return await Promise.resolve({ success: true });
				}
			);

			render(AllTransactionsLoader, { props });

			await waitFor(() => {
				expect(spyLoadNextIcTransactions).toHaveBeenCalledTimes(icTokens.length + counter);
			});
		});
	});

	describe('with Solana tokens', () => {
		it('should load transactions with the correct service', () => {
			render(AllTransactionsLoader, { props });

			expect(spyLoadNextSolTransactions).toHaveBeenCalledTimes(solTokens.length);

			solTokens.forEach(([token]) => {
				const transactions = (get(solTransactionsStore)?.[token.id] ?? []).map(
					({ data: transaction }) => transaction
				);

				expect(spyLoadNextSolTransactions).toHaveBeenCalledWith({
					identity: mockIdentity,
					minTimestamp: mockMinTimestamp,
					transactions,
					token,
					signalEnd: expect.any(Function)
				});
			});
		});

		it('should not keep loading transactions if the service returns a falsy success', () => {
			spyLoadNextSolTransactions.mockResolvedValue({ success: false });

			render(AllTransactionsLoader, { props });

			expect(spyLoadNextSolTransactions).toHaveBeenCalledTimes(solTokens.length);

			solTokens.forEach(([token]) => {
				const transactions = (get(solTransactionsStore)?.[token.id] ?? []).map(
					({ data: transaction }) => transaction
				);

				expect(spyLoadNextSolTransactions).toHaveBeenCalledWith({
					identity: mockIdentity,
					minTimestamp: mockMinTimestamp,
					transactions,
					token,
					signalEnd: expect.any(Function)
				});
			});
		});

		it('should keep loading transactions if the timestamp is still not the minimum', async () => {
			let counter = 0;

			spyLoadNextSolTransactions.mockImplementation(async () => {
				if (Math.random() > 0.3 || counter < 10) {
					counter++;
					return await Promise.resolve({ success: true });
				}
				return await Promise.resolve({ success: false });
			});

			render(AllTransactionsLoader, { props });

			await waitFor(() => {
				expect(spyLoadNextSolTransactions).toHaveBeenCalledTimes(solTokens.length + counter);
			});
		});

		it('should keep loading transactions until there are not more transactions', async () => {
			let counter = 0;

			spyLoadNextSolTransactions.mockImplementation(
				async ({ signalEnd }: { signalEnd: () => void }) => {
					if (Math.random() > 0.3 || counter < 10) {
						counter++;
					} else {
						signalEnd();
					}
					return await Promise.resolve({ success: true });
				}
			);

			render(AllTransactionsLoader, { props });

			await waitFor(() => {
				expect(spyLoadNextSolTransactions).toHaveBeenCalledTimes(solTokens.length + counter);
			});
		});

		it('should not go into a recursive loop that finishes only when there are no more transactions', async () => {
			let counter = 0;

			const newTransaction: SolTransactionUi = {
				...createMockSolTransactionsUi(1)[0],
				timestamp: mockMinTimestampStart + 1n
			};

			spyLoadNextSolTransactions.mockImplementation(
				async ({ signalEnd }: { signalEnd: () => void }) => {
					if (Math.random() > 0.3 || counter < 10) {
						solTokens.forEach(([{ id: tokenId }]) => {
							solTransactionsStore.append({
								tokenId,
								transactions: [{ data: newTransaction, certified: false }]
							});
						});
						counter++;
					} else {
						signalEnd();
					}
					return await Promise.resolve({ success: true });
				}
			);

			render(AllTransactionsLoader, { props });

			await waitFor(() => {
				expect(spyLoadNextSolTransactions).toHaveBeenCalledTimes(solTokens.length + counter);
			});
		});
	});

	it('should handle all types of tokens', () => {
		render(AllTransactionsLoader, { props });

		expect(spyLoadNextIcTransactions).toHaveBeenCalledTimes(icTokens.length);
		expect(spyLoadNextSolTransactions).toHaveBeenCalledTimes(solTokens.length);

		icTokens.forEach(([token]) => {
			const transactions = (get(icTransactionsStore)?.[token.id] ?? []).map(
				({ data: transaction }) => transaction
			);

			expect(spyLoadNextIcTransactions).toHaveBeenCalledWith({
				minTimestamp: mockMinTimestamp,
				transactions,
				owner: mockIdentity.getPrincipal(),
				identity: mockIdentity,
				maxResults: WALLET_PAGINATION,
				token,
				signalEnd: expect.any(Function)
			});
		});

		solTokens.forEach(([token]) => {
			const transactions = (get(solTransactionsStore)?.[token.id] ?? []).map(
				({ data: transaction }) => transaction
			);

			expect(spyLoadNextSolTransactions).toHaveBeenCalledWith({
				identity: mockIdentity,
				minTimestamp: mockMinTimestamp,
				transactions,
				token,
				signalEnd: expect.any(Function)
			});
		});
	});

	it('should ignore errors during loading transactions', () => {
		spyLoadNextIcTransactions.mockRejectedValueOnce(new Error('Error loading IC transactions'));
		spyLoadNextSolTransactions.mockRejectedValueOnce(
			new Error('Error loading Solana transactions')
		);

		render(AllTransactionsLoader, { props });

		expect(spyLoadNextIcTransactions).toHaveBeenCalledTimes(icTokens.length);
		expect(spyLoadNextSolTransactions).toHaveBeenCalledTimes(solTokens.length);
	});

	it('should not load transactions more than once after mounting', async () => {
		vi.spyOn(transactionsUtils, 'areTransactionsStoresLoaded').mockReturnValue(false);

		render(AllTransactionsLoader, { props });

		await tick();

		expect(spyLoadNextIcTransactions).not.toHaveBeenCalled();
		expect(spyLoadNextSolTransactions).not.toHaveBeenCalled();

		vi.spyOn(transactionsUtils, 'areTransactionsStoresLoaded').mockReturnValue(true);
		splDefaultTokensStore.reset();
		await tick();
		splDefaultTokensStore.add(BONK_TOKEN);
		await tick();

		expect(spyLoadNextIcTransactions).toHaveBeenCalledTimes(icTokens.length);
		expect(spyLoadNextSolTransactions).toHaveBeenCalledTimes(solTokens.length);

		vi.spyOn(transactionsUtils, 'areTransactionsStoresLoaded').mockReturnValue(false);
		splDefaultTokensStore.reset();
		await tick();
		splDefaultTokensStore.add(BONK_TOKEN);
		await tick();
		splDefaultTokensStore.reset();
		await tick();
		splDefaultTokensStore.add(BONK_TOKEN);
		await tick();

		expect(spyLoadNextIcTransactions).toHaveBeenCalledTimes(icTokens.length);
		expect(spyLoadNextSolTransactions).toHaveBeenCalledTimes(solTokens.length);
	});
});
