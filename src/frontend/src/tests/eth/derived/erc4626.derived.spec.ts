import { BASE_NETWORK, BASE_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.base.env';
import { ETHEREUM_NETWORK, ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import {
	enabledErc4626AssetAddresses,
	enabledErc4626Tokens,
	erc4626CustomTokens,
	erc4626CustomTokensInitialized,
	erc4626CustomTokensNotInitialized,
	erc4626Tokens,
	erc4626TokensExchangeData
} from '$eth/derived/erc4626.derived';
import { erc4626CustomTokensStore } from '$eth/stores/erc4626-custom-tokens.store';
import { erc4626DefaultTokensStore } from '$eth/stores/erc4626-default-tokens.store';
import type { Erc4626Token } from '$eth/types/erc4626';
import type { Erc4626CustomToken } from '$eth/types/erc4626-custom-token';
import { userNetworks } from '$lib/derived/user-networks.derived';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidToken } from '$tests/mocks/tokens.mock';
import { get } from 'svelte/store';

describe('erc4626.derived', () => {
	const mockErc4626Base: Omit<Erc4626Token, 'id' | 'network' | 'symbol' | 'address'> = {
		...mockValidToken,
		standard: { code: 'erc4626' },
		assetAddress: '0xassetAddress',
		assetDecimals: 6
	};

	const mockErc4626EthereumToken: Erc4626Token = {
		...mockErc4626Base,
		id: parseTokenId('Erc4626EthereumTokenId'),
		network: ETHEREUM_NETWORK,
		symbol: 'vETH',
		address: '0xvaultAddress1'
	};

	const mockErc4626BaseToken: Erc4626Token = {
		...mockErc4626Base,
		id: parseTokenId('Erc4626BaseTokenId'),
		network: BASE_NETWORK,
		symbol: 'vBASE',
		address: '0xvaultAddress2',
		assetAddress: '0xassetAddress2',
		assetDecimals: 8
	};

	const mockErc4626CustomEthereumToken: Erc4626CustomToken = {
		...mockErc4626EthereumToken,
		id: parseTokenId('Erc4626CustomEthereumTokenId'),
		address: '0xcustomVaultAddress1',
		enabled: true
	};

	const mockErc4626CustomBaseToken: Erc4626CustomToken = {
		...mockErc4626BaseToken,
		id: parseTokenId('Erc4626CustomBaseTokenId'),
		address: '0xcustomVaultAddress2',
		enabled: true
	};

	beforeEach(() => {
		vi.resetAllMocks();

		erc4626CustomTokensStore.resetAll();
		erc4626DefaultTokensStore.reset();
	});

	describe('erc4626CustomTokens', () => {
		beforeEach(() => {
			erc4626CustomTokensStore.setAll([
				{ data: mockErc4626CustomEthereumToken, certified: false },
				{ data: mockErc4626CustomBaseToken, certified: false }
			]);
		});

		it('should return all custom tokens when all networks are enabled', () => {
			const result = get(erc4626CustomTokens);

			expect(result).toEqual([mockErc4626CustomEthereumToken, mockErc4626CustomBaseToken]);
		});

		it('should filter by enabled ethereum networks', () => {
			vi.spyOn(userNetworks, 'subscribe').mockImplementation((fn) => {
				fn({
					[ETHEREUM_NETWORK_ID]: { enabled: true, isTestnet: false },
					[BASE_NETWORK_ID]: { enabled: false, isTestnet: false }
				});
				return () => {};
			});

			const result = get(erc4626CustomTokens);

			expect(result).toEqual([mockErc4626CustomEthereumToken]);
		});

		it('should filter by enabled evm networks', () => {
			vi.spyOn(userNetworks, 'subscribe').mockImplementation((fn) => {
				fn({
					[ETHEREUM_NETWORK_ID]: { enabled: false, isTestnet: false },
					[BASE_NETWORK_ID]: { enabled: true, isTestnet: false }
				});
				return () => {};
			});

			const result = get(erc4626CustomTokens);

			expect(result).toEqual([mockErc4626CustomBaseToken]);
		});

		it('should return empty when store is undefined', () => {
			erc4626CustomTokensStore.resetAll();

			const result = get(erc4626CustomTokens);

			expect(result).toEqual([]);
		});
	});

	describe('erc4626Tokens', () => {
		it('should combine default and custom tokens', () => {
			erc4626DefaultTokensStore.set([mockErc4626EthereumToken]);
			erc4626CustomTokensStore.setAll([{ data: mockErc4626CustomBaseToken, certified: false }]);

			const result = get(erc4626Tokens);

			expect(result).toHaveLength(2);
			expect(result[0]).toMatchObject({ address: mockErc4626EthereumToken.address });
			expect(result[1]).toMatchObject({ address: mockErc4626CustomBaseToken.address });
		});

		it('should exclude custom tokens that match a default token', () => {
			erc4626DefaultTokensStore.set([mockErc4626EthereumToken]);

			const customMatchingDefault: Erc4626CustomToken = {
				...mockErc4626EthereumToken,
				version: undefined,
				enabled: true
			};
			erc4626CustomTokensStore.setAll([{ data: customMatchingDefault, certified: false }]);

			const result = get(erc4626Tokens);

			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({ address: mockErc4626EthereumToken.address });
		});
	});

	describe('enabledErc4626Tokens', () => {
		it('should return only enabled tokens', () => {
			erc4626CustomTokensStore.setAll([
				{ data: mockErc4626CustomEthereumToken, certified: false },
				{ data: { ...mockErc4626CustomBaseToken, enabled: false }, certified: false }
			]);

			const result = get(enabledErc4626Tokens);

			expect(result).toEqual([mockErc4626CustomEthereumToken]);
		});

		it('should not include default tokens without a matching enabled custom token', () => {
			erc4626DefaultTokensStore.set([mockErc4626EthereumToken]);

			const result = get(enabledErc4626Tokens);

			expect(result).toHaveLength(0);
		});

		it('should include default token when matching custom token enables it', () => {
			erc4626DefaultTokensStore.set([mockErc4626EthereumToken]);
			erc4626CustomTokensStore.setAll([
				{
					data: { ...mockErc4626EthereumToken, enabled: true },
					certified: false
				}
			]);

			const result = get(enabledErc4626Tokens);

			expect(result.some((t) => t.address === mockErc4626EthereumToken.address)).toBeTruthy();
		});
	});

	describe('erc4626TokensExchangeData', () => {
		it('should map enabled tokens to exchange data', () => {
			erc4626CustomTokensStore.setAll([{ data: mockErc4626CustomEthereumToken, certified: false }]);

			const result = get(erc4626TokensExchangeData);

			expect(result).toEqual([
				{
					vaultAddress: mockErc4626CustomEthereumToken.address,
					vaultDecimals: mockErc4626CustomEthereumToken.decimals,
					assetAddress: mockErc4626CustomEthereumToken.assetAddress,
					assetDecimals: mockErc4626CustomEthereumToken.assetDecimals,
					exchange: ETHEREUM_NETWORK.exchange,
					infura: ETHEREUM_NETWORK.providers.infura
				}
			]);
		});

		it('should return empty when no enabled tokens', () => {
			erc4626CustomTokensStore.setAll([
				{ data: { ...mockErc4626CustomEthereumToken, enabled: false }, certified: false }
			]);

			const result = get(erc4626TokensExchangeData);

			expect(result).toEqual([]);
		});
	});

	describe('erc4626CustomTokensInitialized', () => {
		it('should return true after resetAll (store is null, not undefined)', () => {
			expect(get(erc4626CustomTokensInitialized)).toBeTruthy();
		});

		it('should return true when store has been set', () => {
			erc4626CustomTokensStore.setAll([]);

			expect(get(erc4626CustomTokensInitialized)).toBeTruthy();
		});
	});

	describe('erc4626CustomTokensNotInitialized', () => {
		it('should return false after resetAll (store is null, not undefined)', () => {
			expect(get(erc4626CustomTokensNotInitialized)).toBeFalsy();
		});

		it('should return false when store has been set', () => {
			erc4626CustomTokensStore.setAll([]);

			expect(get(erc4626CustomTokensNotInitialized)).toBeFalsy();
		});
	});

	describe('enabledErc4626AssetAddresses', () => {
		it('should return asset addresses with coingecko ids', () => {
			erc4626CustomTokensStore.setAll([{ data: mockErc4626CustomEthereumToken, certified: false }]);

			const result = get(enabledErc4626AssetAddresses);

			expect(result).toEqual([
				{
					address: mockErc4626CustomEthereumToken.assetAddress,
					coingeckoId: ETHEREUM_NETWORK.exchange?.coingeckoId ?? 'ethereum'
				}
			]);
		});

		it('should return empty when no enabled tokens', () => {
			const result = get(enabledErc4626AssetAddresses);

			expect(result).toEqual([]);
		});
	});
});
