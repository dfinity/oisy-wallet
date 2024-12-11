import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.env';
import { LINK_TOKEN } from '$env/tokens/tokens-erc20/tokens.link.env';
import { PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { USDT_TOKEN_ID } from '$env/tokens/tokens-erc20/tokens.usdt.env';
import * as foo from '$eth/rest/etherscan.rest';
import { EtherscanRest } from '$eth/rest/etherscan.rest';
import { loadEthereumTransactions } from '$eth/services/eth-transactions.services';
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

vi.mock('$eth/rest/etherscan.rest', () => ({
	etherscanRests: vi.fn()
}));

describe('eth-transactions.services', () => {
	describe('loadEthereumTransactions', () => {
		let spyToastsError: MockInstance;

		// we mock console.error and console.warn just to avoid unnecessary logs while running the tests
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);

		beforeEach(() => {
			vi.resetAllMocks();

			spyToastsError = vi.spyOn(toastsStore, 'toastsError');
		});

		describe('when token is ERC20', () => {
			const {
				id: mockTokenId,
				network: { id: mockNetworkId },
				symbol: mockSymbol
			} = USDC_TOKEN;

			const mockErc20UserTokens = [USDC_TOKEN, LINK_TOKEN, PEPE_TOKEN].map((token) => ({
				data: { ...token, enabled: true },
				certified: false
			}));

			const mockTransactionsRest = vi.fn();
			let etherscanRestsSpy: MockInstance;

			beforeEach(() => {
				ethAddressStore.set({ data: mockEthAddress, certified: false });
				erc20UserTokensStore.setAll(mockErc20UserTokens);

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
				const mockTransactions = createMockEthTransactions(3);
				mockTransactionsRest.mockResolvedValueOnce(mockTransactions);

				const result = await loadEthereumTransactions({
					networkId: mockNetworkId,
					tokenId: mockTokenId
				});

				expect(result).toEqual({ success: true });
				expect(get(ethTransactionsStore)).toEqual({ [mockTokenId]: mockTransactions });
			});

			it('should handle errors during transaction fetching gracefully', async () => {
				const mockTransactions = createMockEthTransactions(5);
				ethTransactionsStore.set({ tokenId: mockTokenId, transactions: mockTransactions });

				const mockError = new Error('Mock Error');
				mockTransactionsRest.mockRejectedValue(mockError);

				const result = await loadEthereumTransactions({
					networkId: mockNetworkId,
					tokenId: mockTokenId
				});

				expect(result).toEqual({ success: false });
				expect(get(ethTransactionsStore)).toEqual({ [mockTokenId]: null });
				expect(spyToastsError).toHaveBeenCalledWith({
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
});
