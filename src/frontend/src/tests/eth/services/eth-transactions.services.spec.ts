import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { LINK_TOKEN } from '$env/tokens/tokens-erc20/tokens.link.env';
import { PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { USDT_TOKEN_ID } from '$env/tokens/tokens-erc20/tokens.usdt.env';
import type { EtherscanProvider } from '$eth/providers/etherscan.providers';
import * as etherscanProvidersModule from '$eth/providers/etherscan.providers';
import {
	loadEthereumTransactions,
	reloadEthereumTransactions
} from '$eth/services/eth-transactions.services';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { TRACK_COUNT_ETH_LOADING_TRANSACTIONS_ERROR } from '$lib/constants/analytics.contants';
import { trackEvent } from '$lib/services/analytics.services';
import { ethAddressStore } from '$lib/stores/address.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { createMockEthTransactions } from '$tests/mocks/eth-transactions.mock';
import { mockEthAddress } from '$tests/mocks/eth.mocks';
import en from '$tests/mocks/i18n.mock';
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
		describe('when token is ERC20', () => {
			let etherscanProvidersSpy: MockInstance;

			const mockErc20Transactions = vi.fn();

			const {
				id: mockTokenId,
				network: { id: mockNetworkId },
				symbol: mockSymbol
			} = USDC_TOKEN;

			const mockTransactions = createMockEthTransactions(3);

			beforeEach(() => {
				etherscanProvidersSpy = vi.spyOn(etherscanProvidersModule, 'etherscanProviders');

				etherscanProvidersSpy.mockReturnValue({
					erc20Transactions: mockErc20Transactions
				} as unknown as EtherscanProvider);
			});

			it('should raise an error if the Ethereum address store is empty', async () => {
				ethAddressStore.reset();

				const result = await loadEthereumTransactions({
					networkId: mockNetworkId,
					tokenId: mockTokenId
				});

				expect(spyToastsError).toHaveBeenCalledWith({
					msg: { text: en.init.error.eth_address_unknown }
				});
				expect(result).toEqual({ success: false });
			});

			it('should raise an error if token is not enabled', async () => {
				const result = await loadEthereumTransactions({
					networkId: ETHEREUM_NETWORK_ID,
					tokenId: USDT_TOKEN_ID
				});

				expect(spyToastsError).toHaveBeenCalledWith({
					msg: { text: en.transactions.error.no_token_loading_transaction }
				});
				expect(result).toEqual({ success: false });
			});

			it('should call the transaction function', async () => {
				mockErc20Transactions.mockResolvedValueOnce([]);

				await loadEthereumTransactions({
					networkId: mockNetworkId,
					tokenId: mockTokenId
				});

				expect(mockErc20Transactions).toHaveBeenCalledWith({
					contract: { ...USDC_TOKEN, enabled: true },
					address: mockEthAddress
				});
			});

			it('should handle ERC20 token transactions correctly', async () => {
				mockErc20Transactions.mockResolvedValueOnce(mockTransactions);

				const result = await loadEthereumTransactions({
					networkId: mockNetworkId,
					tokenId: mockTokenId
				});

				expect(result).toEqual({ success: true });
				expect(get(ethTransactionsStore)).toEqual({ [mockTokenId]: mockTransactions });
			});

			it('should handle ERC20 token transactions correctly when it is update only', async () => {
				mockErc20Transactions.mockResolvedValueOnce(mockTransactions);

				const existingTransactions = createMockEthTransactions(5);
				ethTransactionsStore.set({
					tokenId: mockTokenId,
					transactions: [...existingTransactions, mockTransactions[0]]
				});

				const result = await loadEthereumTransactions({
					networkId: mockNetworkId,
					tokenId: mockTokenId,
					updateOnly: true
				});

				expect(result).toEqual({ success: true });
				expect(get(ethTransactionsStore)).toEqual({
					[mockTokenId]: [...existingTransactions, ...mockTransactions]
				});
			});

			it('should handle errors during transaction fetching gracefully', async () => {
				ethTransactionsStore.set({ tokenId: mockTokenId, transactions: mockTransactions });

				const mockError = new Error('Mock Error');
				mockErc20Transactions.mockRejectedValue(mockError);

				const result = await loadEthereumTransactions({
					networkId: mockNetworkId,
					tokenId: mockTokenId
				});

				expect(result).toEqual({ success: false });
				expect(get(ethTransactionsStore)).toEqual({ [mockTokenId]: null });

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
			});
		}, 60000);
	});

	describe('reloadEthereumTransactions', () => {
		let etherscanProvidersSpy: MockInstance;

		const mockErc20Transactions = vi.fn();

		const {
			id: mockTokenId,
			network: { id: mockNetworkId }
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
				transactions: [...existingTransactions, mockTransactions[0]]
			});

			const result = await reloadEthereumTransactions({
				networkId: mockNetworkId,
				tokenId: mockTokenId
			});

			expect(result).toEqual({ success: true });
			expect(get(ethTransactionsStore)).toEqual({
				[mockTokenId]: [...existingTransactions, ...mockTransactions]
			});
		});
	});
});
