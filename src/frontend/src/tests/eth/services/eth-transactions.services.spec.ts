import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { LINK_TOKEN } from '$env/tokens/tokens-erc20/tokens.link.env';
import { PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { USDT_TOKEN_ID } from '$env/tokens/tokens-erc20/tokens.usdt.env';
import type { EtherscanRest } from '$eth/rest/etherscan.rest';
import * as foo from '$eth/rest/etherscan.rest';
import {
	loadEthereumTransactions,
	reloadEthereumTransactions
} from '$eth/services/eth-transactions.services';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { ethAddressStore } from '$lib/stores/address.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { createMockEthTransactions } from '$tests/mocks/eth-transactions.mock';
import { mockEthAddress } from '$tests/mocks/eth.mocks';
import en from '$tests/mocks/i18n.mock';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

// We need to mock these nested dependencies too because otherwise there is an error raise in the importing of `WebSocket` from `ws` inside the `ethers/provider` package
vi.mock('ethers/providers', () => {
	const provider = vi.fn();
	return { EtherscanProvider: provider };
});

vi.mock('$eth/rest/etherscan.rest', () => ({
	etherscanRests: vi.fn()
}));

describe('eth-transactions.services', () => {
	let spyToastsError: MockInstance;
	let spyToastsErrorNoTrace: MockInstance;

	const mockErc20UserTokens = [USDC_TOKEN, LINK_TOKEN, PEPE_TOKEN].map((token) => ({
		data: { ...token, enabled: true },
		certified: false
	}));

	beforeEach(() => {
		vi.clearAllMocks();

		spyToastsError = vi.spyOn(toastsStore, 'toastsError');
		spyToastsErrorNoTrace = vi.spyOn(toastsStore, 'toastsErrorNoTrace');

		ethAddressStore.set({ data: mockEthAddress, certified: false });
		erc20UserTokensStore.setAll(mockErc20UserTokens);
	});

	describe('loadEthereumTransactions', () => {
		describe('when token is ERC20', () => {
			let etherscanRestsSpy: MockInstance;

			const mockTransactionsRest = vi.fn();

			const {
				id: mockTokenId,
				network: { id: mockNetworkId },
				symbol: mockSymbol
			} = USDC_TOKEN;

			const mockTransactions = createMockEthTransactions(3);

			beforeEach(() => {
				etherscanRestsSpy = vi.spyOn(foo, 'etherscanRests');

				etherscanRestsSpy.mockReturnValue({
					transactions: mockTransactionsRest
				} as unknown as EtherscanRest);
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

			it('should call the transaction rest function', async () => {
				mockTransactionsRest.mockResolvedValueOnce([]);

				await loadEthereumTransactions({
					networkId: mockNetworkId,
					tokenId: mockTokenId
				});

				expect(mockTransactionsRest).toHaveBeenCalledWith({
					contract: { ...USDC_TOKEN, enabled: true },
					address: mockEthAddress
				});
			});

			it('should handle ERC20 token transactions correctly', async () => {
				mockTransactionsRest.mockResolvedValueOnce(mockTransactions);

				const result = await loadEthereumTransactions({
					networkId: mockNetworkId,
					tokenId: mockTokenId
				});

				expect(result).toEqual({ success: true });
				expect(get(ethTransactionsStore)).toEqual({ [mockTokenId]: mockTransactions });
			});

			it('should handle ERC20 token transactions correctly when it is update only', async () => {
				mockTransactionsRest.mockResolvedValueOnce(mockTransactions);

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
				mockTransactionsRest.mockRejectedValue(mockError);

				const result = await loadEthereumTransactions({
					networkId: mockNetworkId,
					tokenId: mockTokenId
				});

				expect(result).toEqual({ success: false });
				expect(get(ethTransactionsStore)).toEqual({ [mockTokenId]: null });
				expect(spyToastsErrorNoTrace).toHaveBeenCalledWith({
					err: mockError,
					msg: {
						text: replacePlaceholders(en.transactions.error.loading_transactions_symbol, {
							$symbol: mockSymbol
						})
					}
				});
			});
		}, 60000);
	});

	describe('reloadEthereumTransactions', () => {
		let etherscanRestsSpy: MockInstance;

		const mockTransactionsRest = vi.fn();

		const {
			id: mockTokenId,
			network: { id: mockNetworkId }
		} = USDC_TOKEN;

		const mockTransactions = createMockEthTransactions(3);

		beforeEach(() => {
			etherscanRestsSpy = vi.spyOn(foo, 'etherscanRests');

			etherscanRestsSpy.mockReturnValue({
				transactions: mockTransactionsRest
			} as unknown as EtherscanRest);
		});

		it('should handle ERC20 token transactions correctly', async () => {
			mockTransactionsRest.mockResolvedValueOnce(mockTransactions);

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
