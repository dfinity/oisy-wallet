import { BTC_MAINNET_TOKEN } from '$env/tokens.btc.env';
import { ETHEREUM_TOKEN, ICP_TOKEN } from '$env/tokens.env';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { ExchangesData } from '$lib/types/exchange';
import type { Token } from '$lib/types/token';
import { usdValue } from '$lib/utils/exchange.utils';
import { pinTokensWithBalanceAtTop, sortTokens } from '$lib/utils/tokens.utils';
import { BigNumber } from '@ethersproject/bignumber';
import { describe, expect, it, type MockedFunction } from 'vitest';

const usd = 1;

const bn0 = BigNumber.from(0);
const bn50 = BigNumber.from(50);
const bn100 = BigNumber.from(100);
const bn200 = BigNumber.from(200);

const tokens: Token[] = [ICP_TOKEN, BTC_MAINNET_TOKEN, ETHEREUM_TOKEN];

vi.mock('$lib/utils/exchange.utils', () => ({
	usdValue: vi.fn()
}));

describe('sortTokens', () => {
	it('should sort tokens by market cap, then by name, and finally by network name', () => {
		const tokens: Token[] = [ICP_TOKEN, BTC_MAINNET_TOKEN, ETHEREUM_TOKEN];
		const exchanges: ExchangesData = {
			[ICP_TOKEN.id]: { usd_market_cap: 200, usd },
			[BTC_MAINNET_TOKEN.id]: { usd },
			[ETHEREUM_TOKEN.id]: { usd_market_cap: 300, usd }
		};
		const sortedTokens = sortTokens({ $tokens: tokens, $exchanges: exchanges });
		expect(sortedTokens).toEqual([ETHEREUM_TOKEN, ICP_TOKEN, BTC_MAINNET_TOKEN]);
	});

	it('should sort tokens with same market cap by name', () => {
		const tokens: Token[] = [ICP_TOKEN, BTC_MAINNET_TOKEN, ETHEREUM_TOKEN];
		const exchanges: ExchangesData = {
			[ICP_TOKEN.id]: { usd_market_cap: 200, usd },
			[BTC_MAINNET_TOKEN.id]: { usd_market_cap: 200, usd },
			[ETHEREUM_TOKEN.id]: { usd_market_cap: 200, usd }
		};
		const sortedTokens = sortTokens({ $tokens: tokens, $exchanges: exchanges });
		expect(sortedTokens).toEqual([BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, ICP_TOKEN]);
	});

	it('should sort tokens by name if market cap is not provided', () => {
		const exchanges: ExchangesData = {
			[ICP_TOKEN.id]: { usd },
			[BTC_MAINNET_TOKEN.id]: { usd },
			[ETHEREUM_TOKEN.id]: { usd }
		};
		const sortedTokens = sortTokens({ $tokens: tokens, $exchanges: exchanges });
		expect(sortedTokens).toEqual([BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, ICP_TOKEN]);
	});

	it('should sort tokens with same market cap and name by network name', () => {
		const tokens: Token[] = [ICP_TOKEN, BTC_MAINNET_TOKEN, ETHEREUM_TOKEN].map((token) => ({
			...token,
			name: 'Test Token'
		}));
		const exchanges: ExchangesData = {
			[ICP_TOKEN.id]: { usd_market_cap: 200, usd },
			[BTC_MAINNET_TOKEN.id]: { usd_market_cap: 200, usd },
			[ETHEREUM_TOKEN.id]: { usd_market_cap: 200, usd }
		};
		const sortedTokens = sortTokens({ $tokens: tokens, $exchanges: exchanges });
		expect(sortedTokens).toEqual(
			[BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, ICP_TOKEN].map((token) => ({
				...token,
				name: 'Test Token'
			}))
		);
	});

	it('should sort tokens with same name by network name if market cap is not provided', () => {
		const tokens: Token[] = [ICP_TOKEN, BTC_MAINNET_TOKEN, ETHEREUM_TOKEN].map((token) => ({
			...token,
			name: 'Test Token'
		}));
		const exchanges: ExchangesData = {
			[ICP_TOKEN.id]: { usd },
			[BTC_MAINNET_TOKEN.id]: { usd },
			[ETHEREUM_TOKEN.id]: { usd }
		};
		const sortedTokens = sortTokens({ $tokens: tokens, $exchanges: exchanges });
		expect(sortedTokens).toEqual(
			[BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, ICP_TOKEN].map((token) => ({
				...token,
				name: 'Test Token'
			}))
		);
	});
});

describe('pinTokensWithBalanceAtTop', () => {
	const tokens: Token[] = [ICP_TOKEN, BTC_MAINNET_TOKEN, ETHEREUM_TOKEN];

	const mockUsdValue = usdValue as MockedFunction<typeof usdValue>;

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('should pin tokens with balance at the top', () => {
		const balancesStore: CertifiedStoreData<BalancesData> = {
			[ICP_TOKEN.id]: { data: bn100, certified: true },
			[BTC_MAINNET_TOKEN.id]: { data: bn50, certified: true },
			[ETHEREUM_TOKEN.id]: { data: bn200, certified: true }
		};

		mockUsdValue.mockImplementation(({ token }) => {
			switch (token.id) {
				case ICP_TOKEN.id:
					return 100;
				case BTC_MAINNET_TOKEN.id:
					return 50;
				case ETHEREUM_TOKEN.id:
					return 200;
				default:
					return 0;
			}
		});

		const result = pinTokensWithBalanceAtTop({
			$tokens: tokens,
			$balancesStore: balancesStore
		});
		expect(result).toEqual([ETHEREUM_TOKEN, ICP_TOKEN, BTC_MAINNET_TOKEN]);
	});

	it('should return the same array if no tokens have balance', () => {
		const balancesStore: CertifiedStoreData<BalancesData> = {
			[ICP_TOKEN.id]: { data: bn0, certified: true },
			[BTC_MAINNET_TOKEN.id]: { data: bn0, certified: true },
			[ETHEREUM_TOKEN.id]: { data: bn0, certified: true }
		};

		mockUsdValue.mockImplementation(() => 0);

		const result = pinTokensWithBalanceAtTop({
			$tokens: tokens,
			$balancesStore: balancesStore
		});
		expect(result).toEqual(tokens);
	});

	it('should handle tokens with mixed balances correctly', () => {
		const balancesStore: CertifiedStoreData<BalancesData> = {
			[ICP_TOKEN.id]: { data: bn0, certified: true },
			[BTC_MAINNET_TOKEN.id]: { data: bn50, certified: true },
			[ETHEREUM_TOKEN.id]: { data: bn0, certified: true }
		};

		mockUsdValue.mockImplementation(({ token }) => {
			switch (token.id) {
				case BTC_MAINNET_TOKEN.id:
					return 50;
				default:
					return 0;
			}
		});

		const result = pinTokensWithBalanceAtTop({
			$tokens: tokens,
			$balancesStore: balancesStore
		});
		expect(result).toEqual([BTC_MAINNET_TOKEN, ICP_TOKEN, ETHEREUM_TOKEN]);
	});

	it('should put tokens with no exchange price after tokens with balance', () => {
		const balancesStore: CertifiedStoreData<BalancesData> = {
			[ICP_TOKEN.id]: { data: bn200, certified: true },
			[BTC_MAINNET_TOKEN.id]: { data: bn100, certified: true },
			[ETHEREUM_TOKEN.id]: { data: bn100, certified: true }
		};

		mockUsdValue.mockImplementation(({ token }) => {
			switch (token.id) {
				case ICP_TOKEN.id:
					return 100;
				case BTC_MAINNET_TOKEN.id:
					return 50;
				case ETHEREUM_TOKEN.id:
					return 200;
				default:
					return 0;
			}
		});

		const result = pinTokensWithBalanceAtTop({
			$tokens: tokens,
			$balancesStore: balancesStore
		});
		expect(result).toEqual([ETHEREUM_TOKEN, ICP_TOKEN, BTC_MAINNET_TOKEN]);
	});
});
