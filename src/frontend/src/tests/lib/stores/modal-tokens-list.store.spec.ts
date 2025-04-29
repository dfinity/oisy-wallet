import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { IcToken } from '$icp/types/ic-token';
import { ZERO_BI } from '$lib/constants/app.constants';
import * as exchanges from '$lib/derived/exchange.derived';
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
		})
	};
	const mockTokenUi2 = {
		...mockToken2,
		balance: icpBalance,
		usdBalance: usdValue({
			balance: icpBalance,
			decimals: ICP_TOKEN.decimals,
			exchangeRate: icpExchangeValue
		})
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
			data: { data: ZERO_BI, certified: true }
		});

		expect(get(filterNetwork)).toBe(ICP_NETWORK);
		expect(get(filterQuery)).toBe(undefined);
		expect(get(filteredTokens)).toStrictEqual([mockTokenUi1]);
	});
});
