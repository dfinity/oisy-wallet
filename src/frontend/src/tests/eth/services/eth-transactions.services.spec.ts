import { ETHEREUM_NETWORK, ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { LINK_TOKEN } from '$env/tokens/tokens-erc20/tokens.link.env';
import { PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { USDT_TOKEN, USDT_TOKEN_ID } from '$env/tokens/tokens-erc20/tokens.usdt.env';
import { ETHEREUM_TOKEN, ETHEREUM_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import type { EtherscanProvider } from '$eth/providers/etherscan.providers';
import * as etherscanProvidersModule from '$eth/providers/etherscan.providers';
import {
	loadEthereumTransactions,
	reloadEthereumTransactions
} from '$eth/services/eth-transactions.services';
import {
	loadEthUserTransactions,
	saveEthFinalizedTransactions
} from '$eth/services/eth-user-transactions.services';
import { erc1155CustomTokensStore } from '$eth/stores/erc1155-custom-tokens.store';
import { erc20CustomTokensStore } from '$eth/stores/erc20-custom-tokens.store';
import { erc4626DefaultTokensStore } from '$eth/stores/erc4626-default-tokens.store';
import { erc721CustomTokensStore } from '$eth/stores/erc721-custom-tokens.store';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { TRACK_COUNT_ETH_LOADING_TRANSACTIONS_ERROR } from '$lib/constants/analytics.constants';
import { ZERO_ETH_ADDRESS } from '$lib/constants/app.constants';
import { trackEvent } from '$lib/services/analytics.services';
import { ethAddressStore } from '$lib/stores/address.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockValidErc1155Token } from '$tests/mocks/erc1155-tokens.mock';
import { mockValidErc4626Token } from '$tests/mocks/erc4626-tokens.mock';
import { mockValidErc721Token } from '$tests/mocks/erc721-tokens.mock';
import { createMockEthTransactions } from '$tests/mocks/eth-transactions.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { assertNonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

vi.mock('$eth/providers/etherscan.providers', () => ({
	etherscanProviders: vi.fn()
}));

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

vi.mock('$eth/services/eth-user-transactions.services', () => ({
	loadEthUserTransactions: vi.fn(),
	saveEthFinalizedTransactions: vi.fn()
}));

vi.mock('$lib/utils/console.utils', () => ({
	consoleError: vi.fn()
}));

vi.mock('$env/user-transactions.env', () => ({
	USER_TRANSACTIONS_LOAD_FROM_BACKEND_ENABLED: true
}));

describe('eth-transactions.services', () => {
	const mockErc20CustomTokens = [USDC_TOKEN, LINK_TOKEN, PEPE_TOKEN].map((token) => ({
		data: { ...token, enabled: true },
		certified: false
	}));

	beforeEach(() => {
		vi.clearAllMocks();

		ethAddressStore.set({ data: mockEthAddress, certified: false });
		erc20CustomTokensStore.setAll(mockErc20CustomTokens);
	});

	describe('loadEthereumTransactions', () => {
		describe('when token is ERC', () => {
			let etherscanProvidersSpy: MockInstance;

			const mockErcTransactions = vi.fn();

			const mockTransactions = createMockEthTransactions(3);

			beforeEach(() => {
				etherscanProvidersSpy = vi.spyOn(etherscanProvidersModule, 'etherscanProviders');

				etherscanProvidersSpy.mockReturnValue({
					erc20Transactions: mockErcTransactions,
					erc721Transactions: mockErcTransactions,
					erc1155Transactions: mockErcTransactions
				});

				erc721CustomTokensStore.resetAll();
				erc721CustomTokensStore.setAll([
					{ data: { ...mockValidErc721Token, enabled: true }, certified: false }
				]);

				erc1155CustomTokensStore.resetAll();
				erc1155CustomTokensStore.setAll([
					{ data: { ...mockValidErc1155Token, enabled: true }, certified: false }
				]);
			});

			it('should raise an error if the Ethereum address store is empty', async () => {
				ethAddressStore.reset();

				const {
					id: mockTokenId,
					network: { id: mockNetworkId, chainId: mockChainId },
					standard: mockStandard
				} = USDC_TOKEN;

				const result = await loadEthereumTransactions({
					identity: undefined,
					networkId: mockNetworkId,
					tokenId: mockTokenId,
					chainId: mockChainId,
					standard: mockStandard
				});

				expect(result).toEqual({ success: false });
			});

			it('should return false if token is not enabled', async () => {
				const result = await loadEthereumTransactions({
					identity: undefined,
					networkId: ETHEREUM_NETWORK_ID,
					tokenId: USDT_TOKEN_ID,
					chainId: ETHEREUM_NETWORK.chainId,
					standard: USDT_TOKEN.standard
				});

				expect(result).toEqual({ success: false });
			});

			const tokens = [USDC_TOKEN, mockValidErc721Token, mockValidErc1155Token];

			it.each(tokens)(
				'should call the transaction function for $standard tokens',
				async (token) => {
					const {
						id: mockTokenId,
						network: { id: mockNetworkId, chainId: mockChainId },
						standard: mockStandard
					} = token;

					mockErcTransactions.mockResolvedValueOnce([]);

					await loadEthereumTransactions({
						identity: undefined,
						networkId: mockNetworkId,
						tokenId: mockTokenId,
						chainId: mockChainId,
						standard: mockStandard
					});

					expect(mockErcTransactions).toHaveBeenCalledWith({
						contract: { ...token, enabled: true },
						address: mockEthAddress
					});
				}
			);

			it.each(tokens)(
				'should handle token transactions correctly for $standard tokens',
				async (token) => {
					const {
						id: mockTokenId,
						network: { id: mockNetworkId, chainId: mockChainId },
						standard: mockStandard
					} = token;

					mockErcTransactions.mockResolvedValueOnce(mockTransactions);

					const result = await loadEthereumTransactions({
						identity: undefined,
						networkId: mockNetworkId,
						tokenId: mockTokenId,
						chainId: mockChainId,
						standard: mockStandard
					});

					expect(result).toEqual({ success: true });

					const transactionStore = get(ethTransactionsStore);
					assertNonNullish(transactionStore);

					expect(transactionStore[mockTokenId]).toEqual(
						mockTransactions.map((data) => ({
							data,
							certified: false
						}))
					);
				}
			);

			it.each(tokens)(
				'should handle $standard token transactions correctly when it is update only',
				async (token) => {
					const {
						id: mockTokenId,
						network: { id: mockNetworkId, chainId: mockChainId },
						standard: mockStandard
					} = token;

					mockErcTransactions.mockResolvedValueOnce(mockTransactions);

					const existingTransactions = createMockEthTransactions(5);
					ethTransactionsStore.set({
						tokenId: mockTokenId,
						transactions: [...existingTransactions, mockTransactions[0]].map((data) => ({
							data,
							certified: false
						}))
					});

					const result = await loadEthereumTransactions({
						identity: undefined,
						networkId: mockNetworkId,
						tokenId: mockTokenId,
						chainId: mockChainId,
						standard: mockStandard,
						updateOnly: true
					});

					expect(result).toEqual({ success: true });

					const transactionStore = get(ethTransactionsStore);
					assertNonNullish(transactionStore);

					expect(transactionStore[mockTokenId]).toEqual(
						[...existingTransactions, ...mockTransactions].map((data) => ({
							data,
							certified: false
						}))
					);
				}
			);

			it.each(tokens)(
				'should handle errors during $standard transaction fetching gracefully',
				async (token) => {
					const {
						id: mockTokenId,
						network: { id: mockNetworkId, chainId: mockChainId },
						standard: mockStandard,
						symbol: mockSymbol
					} = token;

					ethTransactionsStore.set({
						tokenId: mockTokenId,
						transactions: mockTransactions.map((data) => ({
							data,
							certified: false
						}))
					});

					const mockError = new Error('Mock Error');
					mockErcTransactions.mockRejectedValue(mockError);

					const result = await loadEthereumTransactions({
						identity: undefined,
						networkId: mockNetworkId,
						tokenId: mockTokenId,
						chainId: mockChainId,
						standard: mockStandard
					});

					expect(result).toEqual({ success: false });

					const transactionStore = get(ethTransactionsStore);
					assertNonNullish(transactionStore);

					expect(transactionStore[mockTokenId]).toEqual(null);

					expect(trackEvent).toHaveBeenCalledWith({
						name: TRACK_COUNT_ETH_LOADING_TRANSACTIONS_ERROR,
						metadata: {
							tokenId: mockTokenId.description,
							networkId: mockNetworkId.description,
							error: mockError.toString()
						},
						warning: `${replacePlaceholders(en.transactions.error.loading_transactions_symbol, {
							$symbol: mockSymbol
						})} ${mockError}`
					});
				}
			);
		}, 60000);

		describe('when token is native ETH', () => {
			let etherscanProvidersSpy: MockInstance;

			const mockEthTransactionsProvider = vi.fn();

			const mockTokenId = ETHEREUM_TOKEN_ID;
			const mockNetworkId = ETHEREUM_NETWORK_ID;
			const mockChainId = ETHEREUM_NETWORK.chainId;
			const mockStandard = ETHEREUM_TOKEN.standard;

			beforeEach(() => {
				etherscanProvidersSpy = vi.spyOn(etherscanProvidersModule, 'etherscanProviders');

				etherscanProvidersSpy.mockReturnValue({
					transactions: mockEthTransactionsProvider
				});

				vi.mocked(loadEthUserTransactions).mockResolvedValue(undefined);
				vi.mocked(saveEthFinalizedTransactions).mockResolvedValue({ success: true });
			});

			it('should return false if address store is empty', async () => {
				ethAddressStore.reset();

				const result = await loadEthereumTransactions({
					identity: mockIdentity,
					networkId: mockNetworkId,
					tokenId: mockTokenId,
					chainId: mockChainId,
					standard: mockStandard
				});

				expect(result).toEqual({ success: false });
				expect(loadEthUserTransactions).not.toHaveBeenCalled();
			});

			it('should call loadEthUserTransactions with identity and EvmNative chainId', async () => {
				mockEthTransactionsProvider.mockResolvedValueOnce([]);

				await loadEthereumTransactions({
					identity: mockIdentity,
					networkId: mockNetworkId,
					tokenId: mockTokenId,
					chainId: mockChainId,
					standard: mockStandard
				});

				expect(loadEthUserTransactions).toHaveBeenCalledWith({
					identity: mockIdentity,
					tokenId: { EvmNative: mockChainId }
				});
			});

			it('should fetch from Etherscan starting at block 0 when no stored transactions', async () => {
				vi.mocked(loadEthUserTransactions).mockResolvedValue(undefined);

				const newTransactions = createMockEthTransactions(3);
				mockEthTransactionsProvider.mockResolvedValueOnce(newTransactions);

				await loadEthereumTransactions({
					identity: mockIdentity,
					networkId: mockNetworkId,
					tokenId: mockTokenId,
					chainId: mockChainId,
					standard: mockStandard
				});

				expect(mockEthTransactionsProvider).toHaveBeenCalledWith({
					address: mockEthAddress,
					startBlock: 0,
					sort: 'desc'
				});
			});

			it('should fetch incrementally from Etherscan using newestBlockIndex + 1', async () => {
				const storedTransactions = createMockEthTransactions(2);

				vi.mocked(loadEthUserTransactions).mockResolvedValue({
					transactions: storedTransactions,
					newestBlockIndex: 100n,
					oldestBlockIndex: 50n,
					nextStart: undefined,
					totalStored: 2n
				});

				mockEthTransactionsProvider.mockResolvedValueOnce([]);

				await loadEthereumTransactions({
					identity: mockIdentity,
					networkId: mockNetworkId,
					tokenId: mockTokenId,
					chainId: mockChainId,
					standard: mockStandard
				});

				expect(mockEthTransactionsProvider).toHaveBeenCalledWith({
					address: mockEthAddress,
					startBlock: 101,
					sort: 'desc'
				});
			});

			it('should combine stored and new transactions in the store', async () => {
				const storedTransactions = createMockEthTransactions(2);
				const newTransactions = createMockEthTransactions(3);

				vi.mocked(loadEthUserTransactions).mockResolvedValue({
					transactions: storedTransactions,
					newestBlockIndex: 100n,
					oldestBlockIndex: 50n,
					nextStart: undefined,
					totalStored: 2n
				});

				mockEthTransactionsProvider.mockResolvedValueOnce(newTransactions);

				const result = await loadEthereumTransactions({
					identity: mockIdentity,
					networkId: mockNetworkId,
					tokenId: mockTokenId,
					chainId: mockChainId,
					standard: mockStandard
				});

				expect(result).toEqual({ success: true });

				const transactionStore = get(ethTransactionsStore);
				assertNonNullish(transactionStore);

				expect(transactionStore[mockTokenId]).toEqual(
					[...newTransactions, ...storedTransactions].map((data) => ({
						data,
						certified: false
					}))
				);
			});

			it('should set only new transactions when no stored transactions exist', async () => {
				vi.mocked(loadEthUserTransactions).mockResolvedValue(undefined);

				const newTransactions = createMockEthTransactions(3);
				mockEthTransactionsProvider.mockResolvedValueOnce(newTransactions);

				const result = await loadEthereumTransactions({
					identity: mockIdentity,
					networkId: mockNetworkId,
					tokenId: mockTokenId,
					chainId: mockChainId,
					standard: mockStandard
				});

				expect(result).toEqual({ success: true });

				const transactionStore = get(ethTransactionsStore);
				assertNonNullish(transactionStore);

				expect(transactionStore[mockTokenId]).toEqual(
					newTransactions.map((data) => ({
						data,
						certified: false
					}))
				);
			});

			it('should use update method when updateOnly is true', async () => {
				vi.mocked(loadEthUserTransactions).mockResolvedValue(undefined);

				const existingTransactions = createMockEthTransactions(2);
				ethTransactionsStore.set({
					tokenId: mockTokenId,
					transactions: existingTransactions.map((data) => ({
						data,
						certified: false
					}))
				});

				const newTransactions = createMockEthTransactions(3);
				mockEthTransactionsProvider.mockResolvedValueOnce(newTransactions);

				const result = await loadEthereumTransactions({
					identity: mockIdentity,
					networkId: mockNetworkId,
					tokenId: mockTokenId,
					chainId: mockChainId,
					standard: mockStandard,
					updateOnly: true
				});

				expect(result).toEqual({ success: true });

				const transactionStore = get(ethTransactionsStore);
				assertNonNullish(transactionStore);

				expect(transactionStore[mockTokenId]).toEqual(
					[...existingTransactions, ...newTransactions].map((data) => ({
						data,
						certified: false
					}))
				);
			});

			it('should call saveEthFinalizedTransactions when new transactions have block numbers', async () => {
				vi.mocked(loadEthUserTransactions).mockResolvedValue(undefined);

				const newTransactions = createMockEthTransactions(3).map((tx, i) => ({
					...tx,
					blockNumber: 100 + i
				}));
				mockEthTransactionsProvider.mockResolvedValueOnce(newTransactions);

				await loadEthereumTransactions({
					identity: mockIdentity,
					networkId: mockNetworkId,
					tokenId: mockTokenId,
					chainId: mockChainId,
					standard: mockStandard
				});

				expect(saveEthFinalizedTransactions).toHaveBeenCalledWith({
					identity: mockIdentity,
					tokenId: { EvmNative: mockChainId },
					transactions: newTransactions,
					currentBlockNumber: 102
				});
			});

			it('should not call saveEthFinalizedTransactions when there are no new transactions', async () => {
				const storedTransactions = createMockEthTransactions(2);

				vi.mocked(loadEthUserTransactions).mockResolvedValue({
					transactions: storedTransactions,
					newestBlockIndex: 100n,
					oldestBlockIndex: 50n,
					nextStart: undefined,
					totalStored: 2n
				});

				mockEthTransactionsProvider.mockResolvedValueOnce([]);

				await loadEthereumTransactions({
					identity: mockIdentity,
					networkId: mockNetworkId,
					tokenId: mockTokenId,
					chainId: mockChainId,
					standard: mockStandard
				});

				expect(saveEthFinalizedTransactions).not.toHaveBeenCalled();
			});

			it('should not call saveEthFinalizedTransactions when new transactions have no block numbers', async () => {
				vi.mocked(loadEthUserTransactions).mockResolvedValue(undefined);

				const newTransactions = createMockEthTransactions(2).map((tx) => ({
					...tx,
					blockNumber: undefined
				}));
				mockEthTransactionsProvider.mockResolvedValueOnce(newTransactions);

				await loadEthereumTransactions({
					identity: mockIdentity,
					networkId: mockNetworkId,
					tokenId: mockTokenId,
					chainId: mockChainId,
					standard: mockStandard
				});

				expect(saveEthFinalizedTransactions).not.toHaveBeenCalled();
			});

			it('should still succeed when saveEthFinalizedTransactions rejects', async () => {
				vi.mocked(loadEthUserTransactions).mockResolvedValue(undefined);

				const newTransactions = createMockEthTransactions(2).map((tx, i) => ({
					...tx,
					blockNumber: 200 + i
				}));
				mockEthTransactionsProvider.mockResolvedValueOnce(newTransactions);

				vi.mocked(saveEthFinalizedTransactions).mockRejectedValue(new Error('Backend save failed'));

				const result = await loadEthereumTransactions({
					identity: mockIdentity,
					networkId: mockNetworkId,
					tokenId: mockTokenId,
					chainId: mockChainId,
					standard: mockStandard
				});

				expect(result).toEqual({ success: true });

				const transactionStore = get(ethTransactionsStore);
				assertNonNullish(transactionStore);

				expect(transactionStore[mockTokenId]).toEqual(
					newTransactions.map((data) => ({
						data,
						certified: false
					}))
				);
			});

			it('should handle Etherscan provider error gracefully', async () => {
				vi.mocked(loadEthUserTransactions).mockResolvedValue(undefined);

				const mockError = new Error('Etherscan error');
				mockEthTransactionsProvider.mockRejectedValue(mockError);

				const result = await loadEthereumTransactions({
					identity: mockIdentity,
					networkId: mockNetworkId,
					tokenId: mockTokenId,
					chainId: mockChainId,
					standard: mockStandard
				});

				expect(result).toEqual({ success: false });

				const transactionStore = get(ethTransactionsStore);
				assertNonNullish(transactionStore);

				expect(transactionStore[mockTokenId]).toEqual(null);

				expect(trackEvent).toHaveBeenCalledWith({
					name: TRACK_COUNT_ETH_LOADING_TRANSACTIONS_ERROR,
					metadata: {
						tokenId: mockTokenId.description,
						networkId: mockNetworkId.description,
						error: mockError.toString()
					},
					warning: `${replacePlaceholders(en.transactions.error.loading_transactions_symbol, {
						$symbol: 'ETH'
					})} ${mockError}`
				});
			});

			it('should handle loadEthUserTransactions failure gracefully', async () => {
				vi.mocked(loadEthUserTransactions).mockRejectedValue(new Error('Backend read failed'));

				const result = await loadEthereumTransactions({
					identity: mockIdentity,
					networkId: mockNetworkId,
					tokenId: mockTokenId,
					chainId: mockChainId,
					standard: mockStandard
				});

				expect(result).toEqual({ success: false });

				const transactionStore = get(ethTransactionsStore);
				assertNonNullish(transactionStore);

				expect(transactionStore[mockTokenId]).toEqual(null);
			});

			it('should use max block number from new transactions for finality check', async () => {
				vi.mocked(loadEthUserTransactions).mockResolvedValue(undefined);

				const newTransactions = createMockEthTransactions(3).map((tx, i) => ({
					...tx,
					blockNumber: [50, 300, 150][i]
				}));
				mockEthTransactionsProvider.mockResolvedValueOnce(newTransactions);

				await loadEthereumTransactions({
					identity: mockIdentity,
					networkId: mockNetworkId,
					tokenId: mockTokenId,
					chainId: mockChainId,
					standard: mockStandard
				});

				expect(saveEthFinalizedTransactions).toHaveBeenCalledWith(
					expect.objectContaining({
						currentBlockNumber: 300
					})
				);
			});
		});

		describe('when token is ERC4626', () => {
			let etherscanProvidersSpy: MockInstance;

			const mockErcTransactions = vi.fn();

			beforeEach(() => {
				etherscanProvidersSpy = vi.spyOn(etherscanProvidersModule, 'etherscanProviders');

				etherscanProvidersSpy.mockReturnValue({
					erc20Transactions: mockErcTransactions
				});

				erc4626DefaultTokensStore.set([mockValidErc4626Token]);
			});

			afterEach(() => {
				erc4626DefaultTokensStore.set([]);
			});

			it('should replace zero address with vault address for mint transactions', async () => {
				const mintTransaction = {
					...createMockEthTransactions(1)[0],
					from: ZERO_ETH_ADDRESS,
					to: mockEthAddress
				};

				mockErcTransactions.mockResolvedValueOnce([mintTransaction]);

				const result = await loadEthereumTransactions({
					identity: undefined,
					networkId: mockValidErc4626Token.network.id,
					tokenId: mockValidErc4626Token.id,
					chainId: mockValidErc4626Token.network.chainId,
					standard: mockValidErc4626Token.standard
				});

				expect(result).toEqual({ success: true });

				const transactionStore = get(ethTransactionsStore);
				assertNonNullish(transactionStore);

				const storedTransactions = transactionStore[mockValidErc4626Token.id];
				assertNonNullish(storedTransactions);

				expect(storedTransactions[0].data.from).toBe(mockValidErc4626Token.address);
				expect(storedTransactions[0].data.to).toBe(mockEthAddress);
			});

			it('should replace zero address with vault address for burn transactions', async () => {
				const burnTransaction = {
					...createMockEthTransactions(1)[0],
					from: mockEthAddress,
					to: ZERO_ETH_ADDRESS
				};

				mockErcTransactions.mockResolvedValueOnce([burnTransaction]);

				const result = await loadEthereumTransactions({
					identity: undefined,
					networkId: mockValidErc4626Token.network.id,
					tokenId: mockValidErc4626Token.id,
					chainId: mockValidErc4626Token.network.chainId,
					standard: mockValidErc4626Token.standard
				});

				expect(result).toEqual({ success: true });

				const transactionStore = get(ethTransactionsStore);
				assertNonNullish(transactionStore);

				const storedTransactions = transactionStore[mockValidErc4626Token.id];
				assertNonNullish(storedTransactions);

				expect(storedTransactions[0].data.from).toBe(mockEthAddress);
				expect(storedTransactions[0].data.to).toBe(mockValidErc4626Token.address);
			});

			it('should not modify addresses for regular transfer transactions', async () => {
				const regularTransaction = {
					...createMockEthTransactions(1)[0],
					from: mockEthAddress,
					to: mockEthAddress
				};

				mockErcTransactions.mockResolvedValueOnce([regularTransaction]);

				const result = await loadEthereumTransactions({
					identity: undefined,
					networkId: mockValidErc4626Token.network.id,
					tokenId: mockValidErc4626Token.id,
					chainId: mockValidErc4626Token.network.chainId,
					standard: mockValidErc4626Token.standard
				});

				expect(result).toEqual({ success: true });

				const transactionStore = get(ethTransactionsStore);
				assertNonNullish(transactionStore);

				const storedTransactions = transactionStore[mockValidErc4626Token.id];
				assertNonNullish(storedTransactions);

				expect(storedTransactions[0].data.from).toBe(mockEthAddress);
				expect(storedTransactions[0].data.to).toBe(mockEthAddress);
			});
		});
	});

	describe('reloadEthereumTransactions', () => {
		let etherscanProvidersSpy: MockInstance;

		const mockErc20Transactions = vi.fn();

		const {
			id: mockTokenId,
			network: { id: mockNetworkId, chainId: mockChainId },
			standard: mockStandard
		} = USDC_TOKEN;

		const mockTransactions = createMockEthTransactions(3);

		beforeEach(() => {
			etherscanProvidersSpy = vi.spyOn(etherscanProvidersModule, 'etherscanProviders');

			etherscanProvidersSpy.mockReturnValue({
				erc20Transactions: mockErc20Transactions
			});
		});

		it('should handle ERC20 token transactions correctly', async () => {
			mockErc20Transactions.mockResolvedValueOnce(mockTransactions);

			const existingTransactions = createMockEthTransactions(5);
			ethTransactionsStore.set({
				tokenId: mockTokenId,
				transactions: [...existingTransactions, mockTransactions[0]].map((data) => ({
					data,
					certified: false
				}))
			});

			const result = await reloadEthereumTransactions({
				identity: undefined,
				networkId: mockNetworkId,
				tokenId: mockTokenId,
				chainId: mockChainId,
				standard: mockStandard
			});

			expect(result).toEqual({ success: true });

			const transactionStore = get(ethTransactionsStore);
			assertNonNullish(transactionStore);

			expect(transactionStore[mockTokenId]).toEqual(
				[...existingTransactions, ...mockTransactions].map((data) => ({
					data,
					certified: false
				}))
			);
		});
	});
});
