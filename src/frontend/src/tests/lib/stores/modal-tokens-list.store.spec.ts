import { ARBITRUM_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { ARB_TOKEN } from '$env/tokens/tokens-evm/tokens-arbitrum/tokens-erc20/tokens.arb.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { IcToken } from '$icp/types/ic-token';
import { ZERO } from '$lib/constants/app.constants';
import * as exchanges from '$lib/derived/exchange.derived';
import { TokenCategoryTagValue } from '$lib/enums/token-tag';
import { balancesStore } from '$lib/stores/balances.store';
import { initModalTokensListContext } from '$lib/stores/modal-tokens-list.store';
import { usdValue } from '$lib/utils/exchange.utils';
import { bn1Bi, bn2Bi } from '$tests/mocks/balances.mock';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { testDerivedUpdates } from '$tests/utils/derived.test-utils';
import { get, readable } from 'svelte/store';

const ckBtcExchangeValue = 1;
const icpExchangeValue = 2;
const ckBtcToken = {
	...mockValidIcCkToken,
	symbol: BTC_MAINNET_TOKEN.twinTokenSymbol
} as IcToken;

describe('modalTokensListStore', () => {
	const ckBtcBalance = bn1Bi;
	const icpBalance = bn2Bi;
	const mockToken1 = { ...ckBtcToken, enabled: true };
	const mockToken2 = { ...ICP_TOKEN, enabled: false };
	const mockTokenUi1 = {
		...mockToken1,
		balance: ckBtcBalance,
		usdBalance: usdValue({
			balance: ckBtcBalance,
			decimals: ckBtcToken.decimals,
			exchangeRate: ckBtcExchangeValue
		}),
		usdPrice: 1,
		usdMarketCap: undefined,
		usdPriceChangePercentage24h: undefined
	};
	const mockTokenUi2 = {
		...mockToken2,
		balance: icpBalance,
		usdBalance: usdValue({
			balance: icpBalance,
			decimals: ICP_TOKEN.decimals,
			exchangeRate: icpExchangeValue
		}),
		usdPrice: 2,
		usdMarketCap: undefined,
		usdPriceChangePercentage24h: undefined
	};

	beforeEach(() => {
		mockPage.reset();

		balancesStore.set({
			id: mockToken1.id,
			data: { data: ckBtcBalance, certified: true }
		});
		balancesStore.set({
			id: mockToken2.id,
			data: { data: icpBalance, certified: true }
		});

		vi.spyOn(exchanges, 'exchanges', 'get').mockImplementation(() =>
			readable({
				[mockToken1.id]: { usd: ckBtcExchangeValue },
				[mockToken2.id]: { usd: icpExchangeValue }
			})
		);
	});

	it('should ensure derived stores update at most once when the store changes', async () => {
		await testDerivedUpdates(() =>
			initModalTokensListContext({
				filterNetwork: ICP_NETWORK,
				filterQuery: 'test',
				filterZeroBalance: true,
				tokens: [mockToken1, mockToken2]
			})
		);
	});

	it('should have all expected values', () => {
		const { filterNetwork, filteredTokens, filterQuery } = initModalTokensListContext({
			filterNetwork: ICP_NETWORK,
			filterZeroBalance: true,
			tokens: [mockToken1, mockToken2]
		});

		expect(get(filterNetwork)).toBe(ICP_NETWORK);
		expect(get(filterQuery)).toBe(undefined);
		expect(get(filteredTokens)).toStrictEqual([mockTokenUi2, mockTokenUi1]);
	});

	it('should reset all filters', () => {
		const { filterNetwork, filteredTokens, filterQuery, filterCategoryTag, resetFilters } =
			initModalTokensListContext({
				filterNetwork: ICP_NETWORK,
				filterQuery: 'test',
				filterCategoryTag: TokenCategoryTagValue.STABLECOIN,
				tokens: [mockToken1, mockToken2]
			});

		resetFilters();

		expect(get(filterNetwork)).toBe(undefined);
		expect(get(filterQuery)).toBe(undefined);
		expect(get(filterCategoryTag)).toBe(undefined);
		expect(get(filteredTokens)).toStrictEqual([mockTokenUi2, mockTokenUi1]);
	});

	it('should update tokens via setTokens', () => {
		const { filteredTokens, setTokens } = initModalTokensListContext({
			tokens: [mockToken1, mockToken2]
		});

		expect(get(filteredTokens)).toHaveLength(2);

		setTokens([mockToken1]);

		expect(get(filteredTokens)).toHaveLength(1);
	});

	it('should update filter network via setFilterNetwork', () => {
		const { filterNetwork, filteredTokens, setFilterNetwork } = initModalTokensListContext({
			filterZeroBalance: true,
			tokens: [mockToken1, mockToken2]
		});

		expect(get(filterNetwork)).toBeUndefined();

		setFilterNetwork(ICP_NETWORK);

		expect(get(filterNetwork)).toBe(ICP_NETWORK);
		expect(get(filteredTokens)).toStrictEqual([mockTokenUi2, mockTokenUi1]);

		setFilterNetwork(undefined);

		expect(get(filterNetwork)).toBeUndefined();
	});

	it('should filter tokens by network', () => {
		const { filterNetwork, filteredTokens, filterQuery } = initModalTokensListContext({
			filterNetwork: ETHEREUM_NETWORK,
			filterZeroBalance: true,
			tokens: [mockToken1, mockToken2]
		});

		expect(get(filterNetwork)).toBe(ETHEREUM_NETWORK);
		expect(get(filterQuery)).toBe(undefined);
		expect(get(filteredTokens)).toStrictEqual([]);
	});

	it('should filter tokens by query', () => {
		const { filterNetwork, filteredTokens, filterQuery } = initModalTokensListContext({
			filterNetwork: ICP_NETWORK,
			filterQuery: 'ckBTC',
			filterZeroBalance: true,
			tokens: [mockToken1, mockToken2]
		});

		expect(get(filterNetwork)).toBe(ICP_NETWORK);
		expect(get(filterQuery)).toBe('ckBTC');
		expect(get(filteredTokens)).toStrictEqual([mockTokenUi1]);
	});

	it('should filter zero-balance tokens', () => {
		const { filterNetwork, filteredTokens, filterQuery } = initModalTokensListContext({
			filterNetwork: ICP_NETWORK,
			filterZeroBalance: true,
			tokens: [mockToken1, mockToken2]
		});

		balancesStore.set({
			id: mockToken2.id,
			data: { data: ZERO, certified: true }
		});

		expect(get(filterNetwork)).toBe(ICP_NETWORK);
		expect(get(filterQuery)).toBe(undefined);
		expect(get(filteredTokens)).toStrictEqual([mockTokenUi1]);
	});

	describe('filterCategoryTag', () => {
		it('should have undefined filterCategoryTag by default', () => {
			const { filterCategoryTag } = initModalTokensListContext({
				tokens: [mockToken1, mockToken2]
			});

			expect(get(filterCategoryTag)).toBeUndefined();
		});

		it('should reflect the initial filterCategoryTag value', () => {
			const { filterCategoryTag } = initModalTokensListContext({
				tokens: [mockToken1, mockToken2],
				filterCategoryTag: TokenCategoryTagValue.CRYPTO
			});

			expect(get(filterCategoryTag)).toBe(TokenCategoryTagValue.CRYPTO);
		});

		it('should update filterCategoryTag via setFilterCategoryTag', () => {
			const { filterCategoryTag, setFilterCategoryTag } = initModalTokensListContext({
				tokens: [mockToken1, mockToken2]
			});

			expect(get(filterCategoryTag)).toBeUndefined();

			setFilterCategoryTag(TokenCategoryTagValue.STABLECOIN);

			expect(get(filterCategoryTag)).toBe(TokenCategoryTagValue.STABLECOIN);
		});

		it('should clear filterCategoryTag when setFilterCategoryTag is called with undefined', () => {
			const { filterCategoryTag, setFilterCategoryTag } = initModalTokensListContext({
				tokens: [mockToken1, mockToken2],
				filterCategoryTag: TokenCategoryTagValue.COMMODITY
			});

			expect(get(filterCategoryTag)).toBe(TokenCategoryTagValue.COMMODITY);

			setFilterCategoryTag(undefined);

			expect(get(filterCategoryTag)).toBeUndefined();
		});
	});

	describe('filterNetworksLabel', () => {
		it('should have undefined filterNetworksLabel by default', () => {
			const { filterNetworksLabel } = initModalTokensListContext({
				tokens: [mockToken1, mockToken2]
			});

			expect(get(filterNetworksLabel)).toBeUndefined();
		});

		it('should reflect the initial filterNetworksLabel value', () => {
			const { filterNetworksLabel } = initModalTokensListContext({
				tokens: [mockToken1, mockToken2],
				filterNetworksLabel: 'EVM Networks'
			});

			expect(get(filterNetworksLabel)).toBe('EVM Networks');
		});

		it('should update filterNetworksLabel via setFilterNetworksLabel', () => {
			const { filterNetworksLabel, setFilterNetworksLabel } = initModalTokensListContext({
				tokens: [mockToken1, mockToken2]
			});

			expect(get(filterNetworksLabel)).toBeUndefined();

			setFilterNetworksLabel('EVM Networks');

			expect(get(filterNetworksLabel)).toBe('EVM Networks');
		});

		it('should clear filterNetworksLabel when setFilterNetworksLabel is called with undefined', () => {
			const { filterNetworksLabel, setFilterNetworksLabel } = initModalTokensListContext({
				tokens: [mockToken1, mockToken2],
				filterNetworksLabel: 'EVM Networks'
			});

			expect(get(filterNetworksLabel)).toBe('EVM Networks');

			setFilterNetworksLabel(undefined);

			expect(get(filterNetworksLabel)).toBeUndefined();
		});

		it('should clear filterNetworksLabel when resetFilters is called', () => {
			const { filterNetworksLabel, resetFilters } = initModalTokensListContext({
				tokens: [mockToken1, mockToken2],
				filterNetworksLabel: 'EVM Networks'
			});

			expect(get(filterNetworksLabel)).toBe('EVM Networks');

			resetFilters();

			expect(get(filterNetworksLabel)).toBeUndefined();
		});
	});

	describe('modalTokensListStore - filterNetworksIds', () => {
		const ethExchangeValue = 3;
		const ethBalance = bn1Bi;

		const mockToken3 = { ...ETHEREUM_TOKEN, enabled: true };
		const mockToken4 = { ...ARB_TOKEN, enabled: true };

		const mockTokenUi3 = {
			...mockToken3,
			balance: ethBalance,
			usdBalance: usdValue({
				balance: ethBalance,
				decimals: ETHEREUM_TOKEN.decimals,
				exchangeRate: ethExchangeValue
			}),
			usdPrice: 3,
			usdMarketCap: undefined,
			usdPriceChangePercentage24h: undefined
		};
		const mockTokenUi4 = {
			...mockToken4,
			balance: ethBalance,
			usdBalance: usdValue({
				balance: ethBalance,
				decimals: ARB_TOKEN.decimals,
				exchangeRate: ethExchangeValue
			}),
			usdPrice: 3,
			usdMarketCap: undefined,
			usdPriceChangePercentage24h: undefined
		};

		beforeEach(() => {
			mockPage.reset();

			balancesStore.set({
				id: mockToken3.id,
				data: { data: ethBalance, certified: true }
			});
			balancesStore.set({
				id: mockToken4.id,
				data: { data: ethBalance, certified: true }
			});

			vi.spyOn(exchanges, 'exchanges', 'get').mockImplementation(() =>
				readable({
					[mockToken3.id]: { usd: ethExchangeValue },
					[mockToken4.id]: { usd: ethExchangeValue }
				})
			);
		});

		it('should filter tokens by filterNetworksIds when provided', () => {
			const { filteredTokens } = initModalTokensListContext({
				tokens: [mockToken3, mockToken4],
				filterNetworksIds: [ETHEREUM_NETWORK.id],
				filterZeroBalance: false
			});

			expect(get(filteredTokens)).toEqual([mockTokenUi3]);
		});

		it('should not filter when filterNetworksIds is undefined', () => {
			const { filteredTokens } = initModalTokensListContext({
				tokens: [mockToken3, mockToken4],
				filterZeroBalance: false
			});

			const result = get(filteredTokens);

			expect(result).toHaveLength(2);

			expect(result).toEqual([mockTokenUi3, mockTokenUi4]);
		});

		it('should filter tokens by multiple network IDs', () => {
			const { filteredTokens } = initModalTokensListContext({
				tokens: [mockToken3, mockToken4],
				filterNetworksIds: [ETHEREUM_NETWORK.id, ARBITRUM_MAINNET_NETWORK.id],
				filterZeroBalance: false
			});

			const result = get(filteredTokens);

			expect(result).toHaveLength(2);
			expect(result).toEqual([mockTokenUi3, mockTokenUi4]);
		});

		it('should combine filterNetworksIds with filterNetwork', () => {
			const { filteredTokens } = initModalTokensListContext({
				tokens: [mockToken3, mockToken4],
				filterNetworksIds: [ETHEREUM_NETWORK.id, ARBITRUM_MAINNET_NETWORK.id],
				filterNetwork: ETHEREUM_NETWORK,
				filterZeroBalance: false
			});

			expect(get(filteredTokens)).toEqual([mockTokenUi3]);
		});

		it('should combine filterNetworksIds with filterQuery', () => {
			const { filteredTokens } = initModalTokensListContext({
				tokens: [mockToken3, mockToken4],
				filterNetworksIds: [ETHEREUM_NETWORK.id, ARBITRUM_MAINNET_NETWORK.id],
				filterQuery: 'Ethereum',
				filterZeroBalance: false
			});

			expect(get(filteredTokens)).toEqual([mockTokenUi3]);
		});

		it('should update filterNetworksIds using setFilterNetworksIds', () => {
			const { filteredTokens, setFilterNetworksIds } = initModalTokensListContext({
				tokens: [mockToken3, mockToken4],
				filterNetworksIds: [ETHEREUM_NETWORK.id],
				filterZeroBalance: false
			});

			expect(get(filteredTokens)).toEqual([mockTokenUi3]);

			setFilterNetworksIds([ARBITRUM_MAINNET_NETWORK.id]);

			expect(get(filteredTokens)).toEqual([mockTokenUi4]);
		});

		it('should clear filterNetworksIds when setFilterNetworksIds is called with undefined', () => {
			const { filteredTokens, setFilterNetworksIds } = initModalTokensListContext({
				tokens: [mockToken3, mockToken4],
				filterNetworksIds: [ETHEREUM_NETWORK.id],
				filterZeroBalance: false
			});

			expect(get(filteredTokens)).toEqual([mockTokenUi3]);

			setFilterNetworksIds(undefined);

			const result = get(filteredTokens);

			expect(result).toHaveLength(2);
		});

		it('should clear filterNetworksIds when setFilterNetworksIds is called with empty array', () => {
			const { filteredTokens } = initModalTokensListContext({
				tokens: [mockToken3, mockToken4],
				filterNetworksIds: [],
				filterZeroBalance: false
			});

			expect(get(filteredTokens)).toEqual([mockTokenUi3, mockTokenUi4]);
		});

		it('should clear filterNetworksIds when changed setFilterNetworksIds to empty array', () => {
			const { filteredTokens, setFilterNetworksIds } = initModalTokensListContext({
				tokens: [mockToken3, mockToken4],
				filterZeroBalance: false
			});

			expect(get(filteredTokens)).toEqual([mockTokenUi3, mockTokenUi4]);

			setFilterNetworksIds([]);

			const result = get(filteredTokens);

			expect(result).toEqual([mockTokenUi3, mockTokenUi4]);
		});
	});
});
