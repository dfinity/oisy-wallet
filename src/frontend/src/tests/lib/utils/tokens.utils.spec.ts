import { BTC_MAINNET_TOKEN } from '$env/tokens.btc.env';
import { ETHEREUM_TOKEN, ICP_TOKEN } from '$env/tokens.env';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { ExchangesData } from '$lib/types/exchange';
import type { Token, TokenToPin, TokenUi } from '$lib/types/token';
import { pinTokensWithBalanceAtTop, sortTokens } from '$lib/utils/tokens.utils';
import { BigNumber } from 'ethers';
import { describe, expect, it } from 'vitest';

const usd = 1;

const bn0 = BigNumber.from(0);
const bn50 = BigNumber.from(50);
const bn100 = BigNumber.from(100);
const bn200 = BigNumber.from(200);

const tokens: Token[] = [ICP_TOKEN, BTC_MAINNET_TOKEN, ETHEREUM_TOKEN];

describe('sortTokens', () => {
	it('should sort tokens by market cap, then by name, and finally by network name', () => {
		const exchanges: ExchangesData = {
			[ICP_TOKEN.id]: { usd_market_cap: 200, usd },
			[BTC_MAINNET_TOKEN.id]: { usd },
			[ETHEREUM_TOKEN.id]: { usd_market_cap: 300, usd }
		};
		const sortedTokens = sortTokens({ $tokens: tokens, $exchanges: exchanges, $tokensToPin: [] });
		expect(sortedTokens).toEqual([ETHEREUM_TOKEN, ICP_TOKEN, BTC_MAINNET_TOKEN]);
	});

	it('should sort tokens with same market cap by name', () => {
		const exchanges: ExchangesData = {
			[ICP_TOKEN.id]: { usd_market_cap: 200, usd },
			[BTC_MAINNET_TOKEN.id]: { usd_market_cap: 200, usd },
			[ETHEREUM_TOKEN.id]: { usd_market_cap: 200, usd }
		};
		const sortedTokens = sortTokens({ $tokens: tokens, $exchanges: exchanges, $tokensToPin: [] });
		expect(sortedTokens).toEqual([BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, ICP_TOKEN]);
	});

	it('should sort tokens by name if market cap is not provided', () => {
		const exchanges: ExchangesData = {
			[ICP_TOKEN.id]: { usd },
			[BTC_MAINNET_TOKEN.id]: { usd },
			[ETHEREUM_TOKEN.id]: { usd }
		};
		const sortedTokens = sortTokens({ $tokens: tokens, $exchanges: exchanges, $tokensToPin: [] });
		expect(sortedTokens).toEqual([BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, ICP_TOKEN]);
	});

	it('should sort tokens with same market cap and name by network name', () => {
		const newTokens: Token[] = tokens.map((token) => ({ ...token, name: 'Test Token' }));
		const exchanges: ExchangesData = {
			[ICP_TOKEN.id]: { usd_market_cap: 200, usd },
			[BTC_MAINNET_TOKEN.id]: { usd_market_cap: 200, usd },
			[ETHEREUM_TOKEN.id]: { usd_market_cap: 200, usd }
		};
		const sortedTokens = sortTokens({
			$tokens: newTokens,
			$exchanges: exchanges,
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
		const newTokens: Token[] = tokens.map((token) => ({ ...token, name: 'Test Token' }));
		const exchanges: ExchangesData = {
			[ICP_TOKEN.id]: { usd },
			[BTC_MAINNET_TOKEN.id]: { usd },
			[ETHEREUM_TOKEN.id]: { usd }
		};
		const sortedTokens = sortTokens({
			$tokens: newTokens,
			$exchanges: exchanges,
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
		const exchanges: ExchangesData = {
			[ICP_TOKEN.id]: { usd_market_cap: 200, usd },
			[BTC_MAINNET_TOKEN.id]: { usd },
			[ETHEREUM_TOKEN.id]: { usd_market_cap: 300, usd }
		};
		const tokensToPin: TokenToPin[] = [ETHEREUM_TOKEN, BTC_MAINNET_TOKEN];
		const sortedTokens = sortTokens({
			$tokens: tokens,
			$exchanges: exchanges,
			$tokensToPin: tokensToPin
		});
		expect(sortedTokens).toEqual([ETHEREUM_TOKEN, BTC_MAINNET_TOKEN, ICP_TOKEN]);
	});
});

describe('pinTokensWithBalanceAtTop', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('should pin tokens with balance at the top', () => {
		const balancesStore: CertifiedStoreData<BalancesData> = {
			[ICP_TOKEN.id]: { data: bn100, certified: true },
			[BTC_MAINNET_TOKEN.id]: { data: bn50, certified: true },
			[ETHEREUM_TOKEN.id]: { data: bn200, certified: true }
		};

		const tokens: TokenUi[] = [
			{ ...ICP_TOKEN, usdBalance: 100 },
			{ ...BTC_MAINNET_TOKEN, usdBalance: 50 },
			{ ...ETHEREUM_TOKEN, usdBalance: 200 }
		];

		const result = pinTokensWithBalanceAtTop({
			$tokens: tokens,
			$balancesStore: balancesStore
		});
		expect(result).toEqual([
			{ ...ETHEREUM_TOKEN, usdBalance: 200 },
			{ ...ICP_TOKEN, usdBalance: 100 },
			{ ...BTC_MAINNET_TOKEN, usdBalance: 50 }
		]);
	});

	it('should return the same array if no tokens have balance', () => {
		const balancesStore: CertifiedStoreData<BalancesData> = {
			[ICP_TOKEN.id]: { data: bn0, certified: true },
			[BTC_MAINNET_TOKEN.id]: { data: bn0, certified: true },
			[ETHEREUM_TOKEN.id]: { data: bn0, certified: true }
		};

		const tokens: TokenUi[] = [ICP_TOKEN, BTC_MAINNET_TOKEN, ETHEREUM_TOKEN].map((token) => ({
			...token,
			usdBalance: 0
		}));

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

		const tokens: TokenUi[] = [
			{ ...ICP_TOKEN, usdBalance: 0 },
			{ ...BTC_MAINNET_TOKEN, usdBalance: 50 },
			{ ...ETHEREUM_TOKEN, usdBalance: 0 }
		];

		const result = pinTokensWithBalanceAtTop({
			$tokens: tokens,
			$balancesStore: balancesStore
		});
		expect(result).toEqual([
			{ ...BTC_MAINNET_TOKEN, usdBalance: 50 },
			{ ...ICP_TOKEN, usdBalance: 0 },
			{ ...ETHEREUM_TOKEN, usdBalance: 0 }
		]);
	});

	it('should put tokens with no exchange price (undefined balance) after tokens with balance', () => {
		const balancesStore: CertifiedStoreData<BalancesData> = {
			[ICP_TOKEN.id]: { data: bn200, certified: true },
			[BTC_MAINNET_TOKEN.id]: { data: bn100, certified: true },
			[ETHEREUM_TOKEN.id]: { data: bn100, certified: true }
		};

		const tokens: TokenUi[] = [
			{ ...ICP_TOKEN },
			{ ...BTC_MAINNET_TOKEN, usdBalance: 50 },
			{ ...ETHEREUM_TOKEN, usdBalance: 200 }
		];

		const result = pinTokensWithBalanceAtTop({
			$tokens: tokens,
			$balancesStore: balancesStore
		});
		expect(result).toEqual([
			{ ...ETHEREUM_TOKEN, usdBalance: 200 },
			{ ...BTC_MAINNET_TOKEN, usdBalance: 50 },
			ICP_TOKEN
		]);
	});
});
