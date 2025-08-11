import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import {
	ETHEREUM_TOKEN,
	ETHEREUM_TOKEN_ID,
	SEPOLIA_TOKEN,
	SEPOLIA_TOKEN_ID
} from '$env/tokens/tokens.eth.env';
import * as infuraErc20ProvidersLib from '$eth/providers/infura-erc20.providers';
import { infuraErc20Providers } from '$eth/providers/infura-erc20.providers';
import * as infuraProvidersLib from '$eth/providers/infura.providers';
import { infuraProviders } from '$eth/providers/infura.providers';
import {
	loadErc20Balances,
	loadEthBalances,
	reloadEthereumBalance
} from '$eth/services/eth-balance.services';
import type { Erc20Token } from '$eth/types/erc20';
import { TRACK_COUNT_ETH_LOADING_BALANCE_ERROR } from '$lib/constants/analytics.contants';
import { trackEvent } from '$lib/services/analytics.services';
import { ethAddressStore } from '$lib/stores/address.store';
import { balancesStore } from '$lib/stores/balances.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { toastsError } from '$lib/stores/toasts.store';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { createMockErc20Tokens, mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { assertNonNullish } from '@dfinity/utils';
import { Contract } from 'ethers/contract';
import { InfuraProvider as InfuraProviderLib } from 'ethers/providers';
import { get } from 'svelte/store';

vi.mock('ethers/providers', () => {
	const provider = vi.fn();
	provider.prototype.getBalance = vi.fn();
	return { InfuraProvider: provider };
});

vi.mock('ethers/contract', () => {
	const contract = vi.fn();
	contract.prototype.balaceOf = vi.fn();
	return { Contract: contract };
});

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

describe('eth-balance.services', () => {
	describe('loadEthBalances', () => {
		const mockTokens = [ETHEREUM_TOKEN, SEPOLIA_TOKEN];

		const mockBalance = 123n;

		const mockError = new Error('Error loading ETH balance');

		const mockGetBalance = vi.fn();
		const mockProvider = vi.mocked(InfuraProviderLib);

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(toastsStore, 'toastsError');
			vi.spyOn(infuraProvidersLib, 'infuraProviders');

			mockProvider.prototype.getBalance = mockGetBalance;
			mockGetBalance.mockResolvedValue(mockBalance);

			ethAddressStore.set({ data: mockEthAddress, certified: false });
		});

		it('should handle a nullish ETH address', async () => {
			ethAddressStore.reset();

			const result = await loadEthBalances(mockTokens);

			expect(result).toEqual({ success: false });

			expect(toastsError).toHaveBeenCalledTimes(mockTokens.length);

			mockTokens.forEach((_, index) => {
				expect(toastsError).toHaveBeenNthCalledWith(index + 1, {
					msg: { text: en.init.error.eth_address_unknown }
				});
			});
		});

		it('should call the balance provider', async () => {
			const result = await loadEthBalances(mockTokens);

			expect(result).toEqual({ success: true });

			expect(infuraProviders).toHaveBeenCalledTimes(mockTokens.length);
			expect(mockGetBalance).toHaveBeenCalledTimes(mockTokens.length);

			mockTokens.forEach((token, index) => {
				expect(infuraProviders).toHaveBeenNthCalledWith(index + 1, token.network.id);
				expect(mockGetBalance).toHaveBeenNthCalledWith(index + 1, mockEthAddress);
			});
		});

		it('should save the token balance', async () => {
			const result = await loadEthBalances(mockTokens);

			expect(result).toEqual({ success: true });

			mockTokens.forEach(({ id }) => {
				expect(get(balancesStore)?.[id]).toEqual({ certified: false, data: mockBalance });
			});
		});

		it('should handle errors when loading ETH balances for a single token', async () => {
			mockGetBalance.mockRejectedValueOnce(mockError);

			const result = await loadEthBalances(mockTokens);

			expect(result).toEqual({ success: false });

			expect(trackEvent).toHaveBeenCalledOnce();
			expect(trackEvent).toHaveBeenNthCalledWith(1, {
				name: TRACK_COUNT_ETH_LOADING_BALANCE_ERROR,
				metadata: {
					tokenId: ETHEREUM_TOKEN_ID.description,
					networkId: ETHEREUM_NETWORK_ID.description,
					error: mockError.toString()
				},
				warning: `${replacePlaceholders(en.init.error.loading_balance, {
					$symbol: `${ETHEREUM_TOKEN_ID.description}`,
					$network: `${ETHEREUM_NETWORK_ID.description}`
				})} ${mockError.toString()}`
			});

			// Required for the type interpreter
			assertNonNullish(ETHEREUM_TOKEN_ID.description);
			assertNonNullish(ETHEREUM_NETWORK_ID.description);

			expect(get(balancesStore)?.[ETHEREUM_TOKEN_ID]).toEqual(null);
			expect(get(balancesStore)?.[SEPOLIA_TOKEN_ID]).toEqual({
				certified: false,
				data: mockBalance
			});
		});

		it('should handle errors when loading ETH balances for all tokens', async () => {
			mockGetBalance.mockRejectedValue(mockError);

			const result = await loadEthBalances(mockTokens);

			expect(result).toEqual({ success: false });

			expect(trackEvent).toHaveBeenCalledTimes(mockTokens.length);

			mockTokens.forEach(({ id: tokenId, network: { id: networkId } }, index) => {
				expect(trackEvent).toHaveBeenNthCalledWith(index + 1, {
					name: TRACK_COUNT_ETH_LOADING_BALANCE_ERROR,
					metadata: {
						tokenId: tokenId.description,
						networkId: networkId.description,
						error: mockError.toString()
					},
					warning: `${replacePlaceholders(en.init.error.loading_balance, {
						$symbol: `${tokenId.description}`,
						$network: `${networkId.description}`
					})} ${mockError.toString()}`
				});
			});

			mockTokens.forEach(({ id }) => {
				expect(get(balancesStore)?.[id]).toEqual(null);
			});
		});
	});

	describe('loadErc20Balances', () => {
		const mockErc20DefaultTokens: Erc20Token[] = createMockErc20Tokens({
			n: 3,
			networkEnv: 'testnet'
		});

		const mockParams = {
			address: mockEthAddress,
			erc20Tokens: mockErc20DefaultTokens
		};

		const mockBalance = 123n;

		const mockError = new Error('Error loading ETH balance');

		const mockGetBalance = vi.fn();
		const mockContract = vi.mocked(Contract);

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(toastsStore, 'toastsError');
			vi.spyOn(infuraErc20ProvidersLib, 'infuraErc20Providers');

			mockContract.prototype.balanceOf =
				mockGetBalance as unknown as typeof mockContract.prototype.balanceOf;
			mockGetBalance.mockResolvedValue(mockBalance);

			ethAddressStore.reset();
		});

		it('should handle a nullish ETH address (both input and store)', async () => {
			const result = await loadErc20Balances({ ...mockParams, address: null });

			expect(result).toEqual({ success: false });

			expect(toastsError).toHaveBeenCalledTimes(mockErc20DefaultTokens.length);

			mockErc20DefaultTokens.forEach((_, index) => {
				expect(toastsError).toHaveBeenNthCalledWith(index + 1, {
					msg: { text: en.init.error.eth_address_unknown }
				});
			});
		});

		it('should use the ETH address store if the input address is nullish', async () => {
			ethAddressStore.set({ data: mockEthAddress, certified: false });

			const result = await loadErc20Balances({ ...mockParams, address: null });

			expect(result).toEqual({ success: true });

			expect(toastsError).not.toHaveBeenCalled();
		});

		it('should call the balance provider', async () => {
			const result = await loadErc20Balances(mockParams);

			expect(result).toEqual({ success: true });

			expect(infuraErc20Providers).toHaveBeenCalledTimes(mockErc20DefaultTokens.length);
			expect(mockGetBalance).toHaveBeenCalledTimes(mockErc20DefaultTokens.length);

			mockErc20DefaultTokens.forEach((token, index) => {
				expect(infuraErc20Providers).toHaveBeenNthCalledWith(index + 1, token.network.id);
				expect(mockGetBalance).toHaveBeenNthCalledWith(index + 1, mockEthAddress);
			});
		});

		it('should save the token balance', async () => {
			const result = await loadErc20Balances(mockParams);

			expect(result).toEqual({ success: true });

			mockErc20DefaultTokens.forEach(({ id }) => {
				expect(get(balancesStore)?.[id]).toEqual({ certified: false, data: mockBalance });
			});
		});

		it('should handle errors when loading ERC20 balances for a single token', async () => {
			mockGetBalance.mockRejectedValueOnce(mockError);

			const result = await loadErc20Balances(mockParams);

			expect(result).toEqual({ success: false });

			expect(trackEvent).toHaveBeenCalledOnce();
			expect(trackEvent).toHaveBeenNthCalledWith(1, {
				name: TRACK_COUNT_ETH_LOADING_BALANCE_ERROR,
				metadata: {
					tokenId: mockErc20DefaultTokens[0].id.description,
					networkId: mockErc20DefaultTokens[0].network.id.description,
					error: mockError.toString()
				},
				warning: `${replacePlaceholders(en.init.error.loading_balance, {
					$symbol: mockErc20DefaultTokens[0].symbol,
					$network: mockErc20DefaultTokens[0].network.name
				})} ${mockError.toString()}`
			});

			expect(get(balancesStore)?.[mockErc20DefaultTokens[0].id]).toEqual(null);

			mockErc20DefaultTokens.slice(1).forEach(({ id }) => {
				expect(get(balancesStore)?.[id]).toEqual({ certified: false, data: mockBalance });
			});
		});

		it('should handle errors when loading ERC20 balances for all tokens', async () => {
			mockGetBalance.mockRejectedValue(mockError);

			const result = await loadErc20Balances(mockParams);

			expect(result).toEqual({ success: false });

			expect(trackEvent).toHaveBeenCalledTimes(mockErc20DefaultTokens.length);

			mockErc20DefaultTokens.forEach(
				(
					{ id: tokenId, symbol: tokenSymbol, network: { id: networkId, name: networkName } },
					index
				) => {
					expect(trackEvent).toHaveBeenNthCalledWith(index + 1, {
						name: TRACK_COUNT_ETH_LOADING_BALANCE_ERROR,
						metadata: {
							tokenId: tokenId.description,
							networkId: networkId.description,
							error: mockError.toString()
						},
						warning: `${replacePlaceholders(en.init.error.loading_balance, {
							$symbol: tokenSymbol,
							$network: networkName
						})} ${mockError.toString()}`
					});
				}
			);

			mockErc20DefaultTokens.forEach(({ id }) => {
				expect(get(balancesStore)?.[id]).toEqual(null);
			});
		});
	});

	describe('reloadEthereumBalance', () => {
		const mockBalance = 123n;

		const mockGetBalance = vi.fn();
		const mockProvider = vi.mocked(InfuraProviderLib);
		const mockContract = vi.mocked(Contract);

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(toastsStore, 'toastsError');
			vi.spyOn(infuraProvidersLib, 'infuraProviders');
			vi.spyOn(infuraErc20ProvidersLib, 'infuraErc20Providers');

			mockProvider.prototype.getBalance = mockGetBalance;
			mockContract.prototype.balanceOf =
				mockGetBalance as unknown as typeof mockContract.prototype.balanceOf;
			mockGetBalance.mockResolvedValue(mockBalance);

			ethAddressStore.set({ data: mockEthAddress, certified: false });
		});

		it('should load balance for a native Ethereum token', async () => {
			const result = await reloadEthereumBalance(ETHEREUM_TOKEN);

			expect(result).toEqual({ success: true });

			expect(get(balancesStore)?.[ETHEREUM_TOKEN_ID]).toEqual({
				certified: false,
				data: mockBalance
			});

			expect(infuraProviders).toHaveBeenCalledOnce();
			expect(infuraProviders).toHaveBeenNthCalledWith(1, ETHEREUM_NETWORK_ID);

			expect(mockGetBalance).toHaveBeenCalledOnce();
			expect(mockGetBalance).toHaveBeenNthCalledWith(1, mockEthAddress);
		});

		it('should load balance for a non-native Ethereum token', async () => {
			const result = await reloadEthereumBalance(mockValidErc20Token);

			expect(result).toEqual({ success: true });

			expect(get(balancesStore)?.[mockValidErc20Token.id]).toEqual({
				certified: false,
				data: mockBalance
			});

			expect(infuraErc20Providers).toHaveBeenCalledOnce();
			expect(infuraErc20Providers).toHaveBeenNthCalledWith(1, mockValidErc20Token.network.id);

			expect(mockGetBalance).toHaveBeenCalledOnce();
			expect(mockGetBalance).toHaveBeenNthCalledWith(1, mockEthAddress);
		});
	});
});
