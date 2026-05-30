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
				selectedFilterNetwork: ICP_NETWORK,
				filterQuery: 'test',
				filterZeroBalance: true,
				tokens: [mockToken1, mockToken2]
			})
		);
	});

	it('should have all expected values', () => {
		const { selectedFilterNetwork, filteredTokens, filterQuery } = initModalTokensListContext({
			selectedFilterNetwork: ICP_NETWORK,
			filterZeroBalance: true,
			tokens: [mockToken1, mockToken2]
		});

		expect(get(selectedFilterNetwork)).toBe(ICP_NETWORK);
		expect(get(filterQuery)).toBe(undefined);
		expect(get(filteredTokens)).toStrictEqual([mockTokenUi2, mockTokenUi1]);
	});

	it('should reset all filters', () => {
		const { selectedFilterNetwork, filteredTokens, filterQuery, filterCategoryTag, resetFilters } =
			initModalTokensListContext({
				selectedFilterNetwork: ICP_NETWORK,
				filterQuery: 'test',
				filterCategoryTag: TokenCategoryTagValue.STABLECOIN,
				tokens: [mockToken1, mockToken2]
			});

		resetFilters();

		expect(get(selectedFilterNetwork)).toBe(undefined);
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

	it('should update filter network via setSelectedFilterNetwork', () => {
		const { selectedFilterNetwork, filteredTokens, setSelectedFilterNetwork } =
			initModalTokensListContext({
				filterZeroBalance: true,
				tokens: [mockToken1, mockToken2]
			});

		expect(get(selectedFilterNetwork)).toBeUndefined();

		setSelectedFilterNetwork(ICP_NETWORK);

		expect(get(selectedFilterNetwork)).toBe(ICP_NETWORK);
		expect(get(filteredTokens)).toStrictEqual([mockTokenUi2, mockTokenUi1]);

		setSelectedFilterNetwork(undefined);

		expect(get(selectedFilterNetwork)).toBeUndefined();
	});

	it('should filter tokens by network', () => {
		const { selectedFilterNetwork, filteredTokens, filterQuery } = initModalTokensListContext({
			selectedFilterNetwork: ETHEREUM_NETWORK,
			filterZeroBalance: true,
			tokens: [mockToken1, mockToken2]
		});

		expect(get(selectedFilterNetwork)).toBe(ETHEREUM_NETWORK);
		expect(get(filterQuery)).toBe(undefined);
		expect(get(filteredTokens)).toStrictEqual([]);
	});

	it('should filter tokens by query', () => {
		const { selectedFilterNetwork, filteredTokens, filterQuery } = initModalTokensListContext({
			selectedFilterNetwork: ICP_NETWORK,
			filterQuery: 'ckBTC',
			filterZeroBalance: true,
			tokens: [mockToken1, mockToken2]
		});

		expect(get(selectedFilterNetwork)).toBe(ICP_NETWORK);
		expect(get(filterQuery)).toBe('ckBTC');
		expect(get(filteredTokens)).toStrictEqual([mockTokenUi1]);
	});

	it('should filter zero-balance tokens', () => {
		const { selectedFilterNetwork, filteredTokens, filterQuery } = initModalTokensListContext({
			selectedFilterNetwork: ICP_NETWORK,
			filterZeroBalance: true,
			tokens: [mockToken1, mockToken2]
		});

		balancesStore.set({
			id: mockToken2.id,
			data: { data: ZERO, certified: true }
		});

		expect(get(selectedFilterNetwork)).toBe(ICP_NETWORK);
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

	describe('modalTokensListStore - availableFilterNetworks', () => {
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

		it('should filter tokens by availableFilterNetworks when provided', () => {
			const { filteredTokens } = initModalTokensListContext({
				tokens: [mockToken3, mockToken4],
				availableFilterNetworks: [ETHEREUM_NETWORK],
				filterZeroBalance: false
			});

			expect(get(filteredTokens)).toEqual([mockTokenUi3]);
		});

		it('should not filter when availableFilterNetworks is undefined', () => {
			const { filteredTokens } = initModalTokensListContext({
				tokens: [mockToken3, mockToken4],
				filterZeroBalance: false
			});

			const result = get(filteredTokens);

			expect(result).toHaveLength(2);

			expect(result).toEqual([mockTokenUi3, mockTokenUi4]);
		});

		it('should filter tokens by multiple networks', () => {
			const { filteredTokens } = initModalTokensListContext({
				tokens: [mockToken3, mockToken4],
				availableFilterNetworks: [ETHEREUM_NETWORK, ARBITRUM_MAINNET_NETWORK],
				filterZeroBalance: false
			});

			const result = get(filteredTokens);

			expect(result).toHaveLength(2);
			expect(result).toEqual([mockTokenUi3, mockTokenUi4]);
		});

		it('should combine availableFilterNetworks with selectedFilterNetwork', () => {
			const { filteredTokens } = initModalTokensListContext({
				tokens: [mockToken3, mockToken4],
				availableFilterNetworks: [ETHEREUM_NETWORK, ARBITRUM_MAINNET_NETWORK],
				selectedFilterNetwork: ETHEREUM_NETWORK,
				filterZeroBalance: false
			});

			expect(get(filteredTokens)).toEqual([mockTokenUi3]);
		});

		it('should combine availableFilterNetworks with filterQuery', () => {
			const { filteredTokens } = initModalTokensListContext({
				tokens: [mockToken3, mockToken4],
				availableFilterNetworks: [ETHEREUM_NETWORK, ARBITRUM_MAINNET_NETWORK],
				filterQuery: 'Ethereum',
				filterZeroBalance: false
			});

			expect(get(filteredTokens)).toEqual([mockTokenUi3]);
		});

		it('should update availableFilterNetworks using setAvailableFilterNetworks', () => {
			const { filteredTokens, setAvailableFilterNetworks } = initModalTokensListContext({
				tokens: [mockToken3, mockToken4],
				availableFilterNetworks: [ETHEREUM_NETWORK],
				filterZeroBalance: false
			});

			expect(get(filteredTokens)).toEqual([mockTokenUi3]);

			setAvailableFilterNetworks([ARBITRUM_MAINNET_NETWORK]);

			expect(get(filteredTokens)).toEqual([mockTokenUi4]);
		});

		it('should clear availableFilterNetworks when setAvailableFilterNetworks is called with undefined', () => {
			const { filteredTokens, setAvailableFilterNetworks } = initModalTokensListContext({
				tokens: [mockToken3, mockToken4],
				availableFilterNetworks: [ETHEREUM_NETWORK],
				filterZeroBalance: false
			});

			expect(get(filteredTokens)).toEqual([mockTokenUi3]);

			setAvailableFilterNetworks(undefined);

			const result = get(filteredTokens);

			expect(result).toHaveLength(2);
		});

		it('should clear availableFilterNetworks when setAvailableFilterNetworks is called with empty array', () => {
			const { filteredTokens } = initModalTokensListContext({
				tokens: [mockToken3, mockToken4],
				availableFilterNetworks: [],
				filterZeroBalance: false
			});

			expect(get(filteredTokens)).toEqual([mockTokenUi3, mockTokenUi4]);
		});

		it('should clear availableFilterNetworks when changed setAvailableFilterNetworks to empty array', () => {
			const { filteredTokens, setAvailableFilterNetworks } = initModalTokensListContext({
				tokens: [mockToken3, mockToken4],
				filterZeroBalance: false
			});

			expect(get(filteredTokens)).toEqual([mockTokenUi3, mockTokenUi4]);

			setAvailableFilterNetworks([]);

			const result = get(filteredTokens);

			expect(result).toEqual([mockTokenUi3, mockTokenUi4]);
		});
	});
});
