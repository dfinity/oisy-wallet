import { BTC_MAINNET_NETWORK_ID, ETHEREUM_NETWORK_ID, ICP_NETWORK_ID } from '$env/networks.env';
import { BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN } from '$env/tokens.btc.env';
import { ETHEREUM_TOKEN, ICP_TOKEN } from '$env/tokens.env';
import { ZERO } from '$lib/constants/app.constants';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { ExchangesData } from '$lib/types/exchange';
import type { Token, TokenToPin, TokenUi } from '$lib/types/token';
import type { TokenToggleable } from '$lib/types/token-toggleable';
import { usdValue } from '$lib/utils/exchange.utils';
import {
	filterEnabledTokens,
	pinEnabledTokensAtTop,
	pinTokensWithBalanceAtTop,
	sortTokens,
	sumMainnetTokensUsdBalancesPerNetwork,
	sumTokensUiUsdBalance
} from '$lib/utils/tokens.utils';
import { bn1, bn2, bn3, certified, mockBalances } from '$tests/mocks/balances.mock';
import { mockExchanges, mockOneUsd } from '$tests/mocks/exchanges.mock';
import { mockTokens } from '$tests/mocks/tokens.mock';
import type { MockedFunction } from 'vitest';

vi.mock('$lib/utils/exchange.utils', () => ({
	usdValue: vi.fn()
}));

describe('sortTokens', () => {
	it('should sort tokens by market cap, then by name, and finally by network name', () => {
		const $exchanges: ExchangesData = {
			[ICP_TOKEN.id]: { usd_market_cap: 200, usd: mockOneUsd },
			[BTC_MAINNET_TOKEN.id]: { usd: mockOneUsd },
			[ETHEREUM_TOKEN.id]: { usd_market_cap: 300, usd: mockOneUsd }
		};
		const sortedTokens = sortTokens({ $tokens: mockTokens, $exchanges, $tokensToPin: [] });
		expect(sortedTokens).toEqual([ETHEREUM_TOKEN, ICP_TOKEN, BTC_MAINNET_TOKEN]);
	});

	it('should sort tokens with same market cap by name', () => {
		const $exchanges: ExchangesData = {
			[ICP_TOKEN.id]: { usd_market_cap: 200, usd: mockOneUsd },
			[BTC_MAINNET_TOKEN.id]: { usd_market_cap: 200, usd: mockOneUsd },
			[ETHEREUM_TOKEN.id]: { usd_market_cap: 200, usd: mockOneUsd }
		};
		const sortedTokens = sortTokens({ $tokens: mockTokens, $exchanges, $tokensToPin: [] });
		expect(sortedTokens).toEqual([BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, ICP_TOKEN]);
	});

	it('should sort tokens by name if market cap is not provided', () => {
		const $exchanges: ExchangesData = {
			[ICP_TOKEN.id]: { usd: mockOneUsd },
			[BTC_MAINNET_TOKEN.id]: { usd: mockOneUsd },
			[ETHEREUM_TOKEN.id]: { usd: mockOneUsd }
		};
		const sortedTokens = sortTokens({ $tokens: mockTokens, $exchanges, $tokensToPin: [] });
		expect(sortedTokens).toEqual([BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, ICP_TOKEN]);
	});

	it('should sort tokens with same market cap and name by network name', () => {
		const newTokens: Token[] = mockTokens.map((token) => ({ ...token, name: 'Test Token' }));
		const $exchanges: ExchangesData = {
			[ICP_TOKEN.id]: { usd_market_cap: 200, usd: mockOneUsd },
			[BTC_MAINNET_TOKEN.id]: { usd_market_cap: 200, usd: mockOneUsd },
			[ETHEREUM_TOKEN.id]: { usd_market_cap: 200, usd: mockOneUsd }
		};
		const sortedTokens = sortTokens({
			$tokens: newTokens,
			$exchanges,
			$tokensToPin: []
		});
		expect(sortedTokens).toEqual(
			[BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, ICP_TOKEN].map((token) => ({
				...token,
				name: 'Test Token'
			}))
		);
	});

	it('should sort tokens with same name by network name if market cap is not provided', () => {
		const newTokens: Token[] = mockTokens.map((token) => ({ ...token, name: 'Test Token' }));
		const $exchanges: ExchangesData = {
			[ICP_TOKEN.id]: { usd: mockOneUsd },
			[BTC_MAINNET_TOKEN.id]: { usd: mockOneUsd },
			[ETHEREUM_TOKEN.id]: { usd: mockOneUsd }
		};
		const sortedTokens = sortTokens({
			$tokens: newTokens,
			$exchanges,
			$tokensToPin: []
		});
		expect(sortedTokens).toEqual(
			[BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, ICP_TOKEN].map((token) => ({
				...token,
				name: 'Test Token'
			}))
		);
	});

	it('should pin tokens at the top of the list', () => {
		const $exchanges: ExchangesData = {
			[ICP_TOKEN.id]: { usd_market_cap: 200, usd: mockOneUsd },
			[BTC_MAINNET_TOKEN.id]: { usd: mockOneUsd },
			[ETHEREUM_TOKEN.id]: { usd_market_cap: 300, usd: mockOneUsd }
		};
		const tokensToPin: TokenToPin[] = [ETHEREUM_TOKEN, BTC_MAINNET_TOKEN];
		const sortedTokens = sortTokens({
			$tokens: mockTokens,
			$exchanges,
			$tokensToPin: tokensToPin
		});
		expect(sortedTokens).toEqual([ETHEREUM_TOKEN, BTC_MAINNET_TOKEN, ICP_TOKEN]);
	});
});

describe('pinTokensWithBalanceAtTop', () => {
	const mockUsdValue = usdValue as MockedFunction<typeof usdValue>;

	beforeEach(() => {
		vi.resetAllMocks();

		mockUsdValue.mockImplementation(
			({ balance, exchangeRate }) => Number(balance ?? 0) * exchangeRate
		);
	});

	it('should pin tokens with usd balance at the top and sort by usd balance', () => {
		const newBalances: CertifiedStoreData<BalancesData> = {
			[ICP_TOKEN.id]: { data: bn2, certified },
			[BTC_MAINNET_TOKEN.id]: { data: bn1, certified },
			[ETHEREUM_TOKEN.id]: { data: bn3, certified }
		};

		const result = pinTokensWithBalanceAtTop({
			$tokens: mockTokens,
			$balances: newBalances,
			$exchanges: mockExchanges
		});

		expect(result.map((token) => token.id)).toEqual([
			ETHEREUM_TOKEN.id,
			ICP_TOKEN.id,
			BTC_MAINNET_TOKEN.id
		]);
	});

	it('should put tokens with no usd balance after the ones with and sort them by balance', () => {
		const newExchanges: ExchangesData = {
			[ICP_TOKEN.id]: { usd: mockOneUsd }
		};

		const result = pinTokensWithBalanceAtTop({
			$tokens: mockTokens,
			$balances: mockBalances,
			$exchanges: newExchanges
		});

		expect(result.map((token) => token.id)).toEqual([
			ICP_TOKEN.id,
			ETHEREUM_TOKEN.id,
			BTC_MAINNET_TOKEN.id
		]);
	});

	it('should return the same array if all tokens have no balance', () => {
		const newBalances: CertifiedStoreData<BalancesData> = {
			[ICP_TOKEN.id]: { data: ZERO, certified },
			[BTC_MAINNET_TOKEN.id]: { data: ZERO, certified },
			[ETHEREUM_TOKEN.id]: { data: ZERO, certified }
		};

		const result = pinTokensWithBalanceAtTop({
			$tokens: mockTokens,
			$balances: newBalances,
			$exchanges: mockExchanges
		});

		expect(result.map((token) => token.id)).toEqual([
			ICP_TOKEN.id,
			BTC_MAINNET_TOKEN.id,
			ETHEREUM_TOKEN.id
		]);
	});

	it('should sort only tokens with non-zero balances and leave untouched the rest', () => {
		const newBalances: CertifiedStoreData<BalancesData> = {
			[ICP_TOKEN.id]: { data: ZERO, certified },
			[BTC_MAINNET_TOKEN.id]: { data: bn1, certified },
			[ETHEREUM_TOKEN.id]: { data: ZERO, certified }
		};

		const result = pinTokensWithBalanceAtTop({
			$tokens: mockTokens,
			$balances: newBalances,
			$exchanges: mockExchanges
		});

		expect(result.map((token) => token.id)).toEqual([
			BTC_MAINNET_TOKEN.id,
			ICP_TOKEN.id,
			ETHEREUM_TOKEN.id
		]);
	});

	it('should put tokens with no exchange data after tokens with balance', () => {
		const newBalances: CertifiedStoreData<BalancesData> = {
			[BTC_MAINNET_TOKEN.id]: { data: bn1, certified },
			[ETHEREUM_TOKEN.id]: { data: bn3, certified }
		};

		const result = pinTokensWithBalanceAtTop({
			$tokens: mockTokens,
			$balances: newBalances,
			$exchanges: mockExchanges
		});

		expect(result.map((token) => token.id)).toEqual([
			ETHEREUM_TOKEN.id,
			BTC_MAINNET_TOKEN.id,
			ICP_TOKEN.id
		]);
	});
});

describe('sumTokensUiUsdBalance', () => {
	it('should correctly calculate USD total balance when tokens have usdBalance', () => {
		const tokens: TokenUi[] = [
			{ ...ICP_TOKEN, usdBalance: 50 },
			{ ...BTC_MAINNET_TOKEN, usdBalance: 50 },
			{ ...ETHEREUM_TOKEN, usdBalance: 100 }
		];

		const result = sumTokensUiUsdBalance(tokens);
		expect(result).toEqual(200);
	});

	it('should correctly calculate USD total balance when some tokens do not have usdBalance', () => {
		const tokens: TokenUi[] = [
			{ ...ICP_TOKEN, usdBalance: 50 },
			{ ...BTC_MAINNET_TOKEN, usdBalance: 0 },
			{ ...ETHEREUM_TOKEN }
		];

		const result = sumTokensUiUsdBalance(tokens);
		expect(result).toEqual(50);
	});

	it('should correctly calculate USD total balance when tokens list is empty', () => {
		const result = sumTokensUiUsdBalance([]);
		expect(result).toEqual(0);
	});
});

describe('filterEnabledTokens', () => {
	it('should correctly return filtered tokens when all tokens have "enabled" property', () => {
		const ENABLED_ICP_TOKEN = { ...ICP_TOKEN, enabled: true };
		const ENABLED_ETHEREUM_TOKEN = { ...ENABLED_ICP_TOKEN, enabled: true };

		const tokens: (Token & { enabled?: boolean })[] = [
			ENABLED_ICP_TOKEN,
			ENABLED_ETHEREUM_TOKEN,
			{ ...BTC_MAINNET_TOKEN, enabled: false }
		];

		const result = filterEnabledTokens([tokens]);
		expect(result).toEqual([ENABLED_ICP_TOKEN, ENABLED_ETHEREUM_TOKEN]);
	});

	it('should correctly return filtered tokens when not all tokens have "enabled" property', () => {
		const ENABLED_BY_DEFAULT_ICP_TOKEN = ICP_TOKEN;
		const ENABLED_BY_DEFAULT_ETHEREUM_TOKEN = ETHEREUM_TOKEN;

		const tokens: (Token & { enabled?: boolean })[] = [
			ENABLED_BY_DEFAULT_ICP_TOKEN,
			ENABLED_BY_DEFAULT_ETHEREUM_TOKEN,
			{ ...BTC_MAINNET_TOKEN, enabled: false }
		];

		const result = filterEnabledTokens([tokens]);
		expect(result).toEqual([ENABLED_BY_DEFAULT_ICP_TOKEN, ENABLED_BY_DEFAULT_ETHEREUM_TOKEN]);
	});
});

describe('sumMainnetTokensUsdBalancesPerNetwork', () => {
	const mockUsdValue = usdValue as MockedFunction<typeof usdValue>;

	beforeEach(() => {
		vi.resetAllMocks();

		mockUsdValue.mockImplementation(
			({ balance, exchangeRate }) => Number(balance ?? 0) * exchangeRate
		);
	});

	it('should return a dictionary with correct balances for the list of mainnet and testnet tokens', () => {
		const balances = {
			...mockBalances,
			[BTC_TESTNET_TOKEN.id]: { data: bn3, certified }
		};
		const tokens = [...mockTokens, BTC_TESTNET_TOKEN];

		const result = sumMainnetTokensUsdBalancesPerNetwork({
			$tokens: tokens,
			$balances: balances,
			$exchanges: mockExchanges
		});
		expect(result).toEqual({
			[BTC_MAINNET_NETWORK_ID]: bn2.toNumber(),
			[ETHEREUM_NETWORK_ID]: bn3.toNumber(),
			[ICP_NETWORK_ID]: bn1.toNumber()
		});
	});

	it('should return a dictionary with correct balances if all token balances are 0', () => {
		const balances = {
			[ICP_TOKEN.id]: { data: ZERO, certified },
			[BTC_MAINNET_TOKEN.id]: { data: ZERO, certified },
			[ETHEREUM_TOKEN.id]: { data: ZERO, certified },
			[BTC_TESTNET_TOKEN.id]: { data: ZERO, certified }
		};
		const tokens = [...mockTokens, BTC_TESTNET_TOKEN];

		const result = sumMainnetTokensUsdBalancesPerNetwork({
			$tokens: tokens,
			$balances: balances,
			$exchanges: mockExchanges
		});
		expect(result).toEqual({
			[BTC_MAINNET_NETWORK_ID]: ZERO.toNumber(),
			[ETHEREUM_NETWORK_ID]: ZERO.toNumber(),
			[ICP_NETWORK_ID]: ZERO.toNumber()
		});
	});

	it('should return an empty dictionary if no mainnet tokens are in the list', () => {
		const balances = {
			...mockBalances,
			[BTC_TESTNET_TOKEN.id]: { data: bn2, certified }
		};
		const tokens = [BTC_TESTNET_TOKEN];

		const result = sumMainnetTokensUsdBalancesPerNetwork({
			$tokens: tokens,
			$balances: balances,
			$exchanges: mockExchanges
		});
		expect(result).toEqual({});
	});

	it('should return an empty dictionary if no tokens are provided', () => {
		const result = sumMainnetTokensUsdBalancesPerNetwork({
			$tokens: [],
			$balances: mockBalances,
			$exchanges: mockExchanges
		});
		expect(result).toEqual({});
	});
});

describe('pinEnabledTokensAtTop', () => {
	it('should pin enabled tokens at the top while preserving the order', () => {
		const tokens: TokenToggleable<Token>[] = [
			{ ...ICP_TOKEN, enabled: false },
			{ ...BTC_MAINNET_TOKEN, enabled: true },
			{ ...ETHEREUM_TOKEN, enabled: true }
		];

		const result = pinEnabledTokensAtTop(tokens);

		expect(result).toEqual([
			{ ...BTC_MAINNET_TOKEN, enabled: true },
			{ ...ETHEREUM_TOKEN, enabled: true },
			{ ...ICP_TOKEN, enabled: false }
		]);
	});

	it('should return the same array when all tokens are enabled', () => {
		const tokens: TokenToggleable<Token>[] = mockTokens.map((t) => ({ ...t, enabled: true }));

		const result = pinEnabledTokensAtTop(tokens);

		expect(result).toEqual(tokens);
	});

	it('should return the same array when all tokens are disabled', () => {
		const tokens: TokenToggleable<Token>[] = mockTokens.map((t) => ({ ...t, enabled: false }));

		const result = pinEnabledTokensAtTop(tokens);

		expect(result).toEqual(tokens);
	});
});
