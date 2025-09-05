import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { LINK_TOKEN } from '$env/tokens/tokens-erc20/tokens.link.env';
import { PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { USDT_TOKEN, USDT_TOKEN_ID } from '$env/tokens/tokens-erc20/tokens.usdt.env';
import type { EtherscanProvider } from '$eth/providers/etherscan.providers';
import * as etherscanProvidersModule from '$eth/providers/etherscan.providers';
import {
	loadEthereumTransactions,
	reloadEthereumTransactions
} from '$eth/services/eth-transactions.services';
import { erc1155CustomTokensStore } from '$eth/stores/erc1155-custom-tokens.store';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import { erc721CustomTokensStore } from '$eth/stores/erc721-custom-tokens.store';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { TRACK_COUNT_ETH_LOADING_TRANSACTIONS_ERROR } from '$lib/constants/analytics.contants';
import { trackEvent } from '$lib/services/analytics.services';
import { ethAddressStore } from '$lib/stores/address.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockValidErc1155Token } from '$tests/mocks/erc1155-tokens.mock';
import { mockValidErc721Token } from '$tests/mocks/erc721-tokens.mock';
import { createMockEthTransactions } from '$tests/mocks/eth-transactions.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { assertNonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

vi.mock('$eth/providers/etherscan.providers', () => ({
	etherscanProviders: vi.fn()
}));

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

describe('eth-transactions.services', () => {
	let spyToastsError: MockInstance;

	const mockErc20UserTokens = [USDC_TOKEN, LINK_TOKEN, PEPE_TOKEN].map((token) => ({
		data: { ...token, enabled: true },
		certified: false
	}));

	beforeEach(() => {
		vi.clearAllMocks();

		spyToastsError = vi.spyOn(toastsStore, 'toastsError');

		ethAddressStore.set({ data: mockEthAddress, certified: false });
		erc20UserTokensStore.setAll(mockErc20UserTokens);
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
				} as unknown as EtherscanProvider);

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
					network: { id: mockNetworkId },
					standard: mockStandard
				} = USDC_TOKEN;

				const result = await loadEthereumTransactions({
					networkId: mockNetworkId,
					tokenId: mockTokenId,
					standard: mockStandard
				});

				expect(spyToastsError).toHaveBeenCalledWith({
					msg: { text: en.init.error.eth_address_unknown }
				});
				expect(result).toEqual({ success: false });
			});

			it('should raise an error if token is not enabled', async () => {
				const result = await loadEthereumTransactions({
					networkId: ETHEREUM_NETWORK_ID,
					tokenId: USDT_TOKEN_ID,
					standard: USDT_TOKEN.standard
				});

				expect(spyToastsError).toHaveBeenCalledWith({
					msg: { text: en.transactions.error.no_token_loading_transaction }
				});
				expect(result).toEqual({ success: false });
			});

			const tokens = [USDC_TOKEN, mockValidErc721Token, mockValidErc1155Token];

			it.each(tokens)(
				'should call the transaction function for $standard tokens',
				async (token) => {
					const {
						id: mockTokenId,
						network: { id: mockNetworkId },
						standard: mockStandard
					} = token;

					mockErcTransactions.mockResolvedValueOnce([]);

					await loadEthereumTransactions({
						networkId: mockNetworkId,
						tokenId: mockTokenId,
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
						network: { id: mockNetworkId },
						standard: mockStandard
					} = token;

					mockErcTransactions.mockResolvedValueOnce(mockTransactions);

					const result = await loadEthereumTransactions({
						networkId: mockNetworkId,
						tokenId: mockTokenId,
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
						network: { id: mockNetworkId },
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
						networkId: mockNetworkId,
						tokenId: mockTokenId,
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
						network: { id: mockNetworkId },
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
						networkId: mockNetworkId,
						tokenId: mockTokenId,
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
	});

	describe('reloadEthereumTransactions', () => {
		let etherscanProvidersSpy: MockInstance;

		const mockErc20Transactions = vi.fn();

		const {
			id: mockTokenId,
			network: { id: mockNetworkId },
			standard: mockStandard
		} = USDC_TOKEN;

		const mockTransactions = createMockEthTransactions(3);

		beforeEach(() => {
			etherscanProvidersSpy = vi.spyOn(etherscanProvidersModule, 'etherscanProviders');

			etherscanProvidersSpy.mockReturnValue({
				erc20Transactions: mockErc20Transactions
			} as unknown as EtherscanProvider);
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
				networkId: mockNetworkId,
				tokenId: mockTokenId,
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
