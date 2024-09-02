import { BTC_MAINNET_TOKEN } from '$env/tokens.btc.env';
import { ETHEREUM_TOKEN, ICP_TOKEN } from '$env/tokens.env';
import { ZERO } from '$lib/constants/app.constants';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { ExchangesData } from '$lib/types/exchange';
import type { Token, TokenToPin } from '$lib/types/token';
import { pinTokensWithBalanceAtTop, sortTokens } from '$lib/utils/tokens.utils';
import { BigNumber } from 'alchemy-sdk';
import { describe, expect, it } from 'vitest';

const usd = 1;

const certified = true;

const bn1 = BigNumber.from(100000000n);
const bn2 = BigNumber.from(200000000n);
const bn3 = BigNumber.from(3000000000000000000n);

const $tokens: Token[] = [ICP_TOKEN, BTC_MAINNET_TOKEN, ETHEREUM_TOKEN];

const $balances: CertifiedStoreData<BalancesData> = {
	[ICP_TOKEN.id]: { data: bn1, certified },
	[BTC_MAINNET_TOKEN.id]: { data: bn2, certified },
	[ETHEREUM_TOKEN.id]: { data: bn3, certified }
};

const $exchanges: ExchangesData = $tokens.reduce<ExchangesData>((acc, token) => {
	acc[token.id] = { usd };
	return acc;
}, {});

describe('sortTokens', () => {
	it('should sort tokens by market cap, then by name, and finally by network name', () => {
		const $exchanges: ExchangesData = {
			[ICP_TOKEN.id]: { usd_market_cap: 200, usd },
			[BTC_MAINNET_TOKEN.id]: { usd },
			[ETHEREUM_TOKEN.id]: { usd_market_cap: 300, usd }
		};
		const sortedTokens = sortTokens({ $tokens, $exchanges, $tokensToPin: [] });
		expect(sortedTokens).toEqual([ETHEREUM_TOKEN, ICP_TOKEN, BTC_MAINNET_TOKEN]);
	});

	it('should sort tokens with same market cap by name', () => {
		const $exchanges: ExchangesData = {
			[ICP_TOKEN.id]: { usd_market_cap: 200, usd },
			[BTC_MAINNET_TOKEN.id]: { usd_market_cap: 200, usd },
			[ETHEREUM_TOKEN.id]: { usd_market_cap: 200, usd }
		};
		const sortedTokens = sortTokens({ $tokens, $exchanges, $tokensToPin: [] });
		expect(sortedTokens).toEqual([BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, ICP_TOKEN]);
	});

	it('should sort tokens by name if market cap is not provided', () => {
		const $exchanges: ExchangesData = {
			[ICP_TOKEN.id]: { usd },
			[BTC_MAINNET_TOKEN.id]: { usd },
			[ETHEREUM_TOKEN.id]: { usd }
		};
		const sortedTokens = sortTokens({ $tokens, $exchanges, $tokensToPin: [] });
		expect(sortedTokens).toEqual([BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, ICP_TOKEN]);
	});

	it('should sort tokens with same market cap and name by network name', () => {
		const newTokens: Token[] = $tokens.map((token) => ({ ...token, name: 'Test Token' }));
		const $exchanges: ExchangesData = {
			[ICP_TOKEN.id]: { usd_market_cap: 200, usd },
			[BTC_MAINNET_TOKEN.id]: { usd_market_cap: 200, usd },
			[ETHEREUM_TOKEN.id]: { usd_market_cap: 200, usd }
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
		const newTokens: Token[] = $tokens.map((token) => ({ ...token, name: 'Test Token' }));
		const $exchanges: ExchangesData = {
			[ICP_TOKEN.id]: { usd },
			[BTC_MAINNET_TOKEN.id]: { usd },
			[ETHEREUM_TOKEN.id]: { usd }
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
			[ICP_TOKEN.id]: { usd_market_cap: 200, usd },
			[BTC_MAINNET_TOKEN.id]: { usd },
			[ETHEREUM_TOKEN.id]: { usd_market_cap: 300, usd }
		};
		const tokensToPin: TokenToPin[] = [ETHEREUM_TOKEN, BTC_MAINNET_TOKEN];
		const sortedTokens = sortTokens({
			$tokens,
			$exchanges,
			$tokensToPin: tokensToPin
		});
		expect(sortedTokens).toEqual([ETHEREUM_TOKEN, BTC_MAINNET_TOKEN, ICP_TOKEN]);
	});
});

describe('pinTokensWithBalanceAtTop', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('should return a list of tokens with balance as prop if balance data not undefined', () => {
		const newBalances: CertifiedStoreData<BalancesData> = {
			[ICP_TOKEN.id]: { data: bn1, certified },
			[BTC_MAINNET_TOKEN.id]: { data: bn2, certified }
		};

		const result = pinTokensWithBalanceAtTop({ $tokens, $balances: newBalances, $exchanges });

		expect(result).toContainEqual({
			...ICP_TOKEN,
			balance: bn1,
			usdBalance: 1
		});
		expect(result).toContainEqual({
			...BTC_MAINNET_TOKEN,
			balance: bn2,
			usdBalance: 2
		});
		expect(result).toContainEqual({
			...ETHEREUM_TOKEN,
			balance: undefined,
			usdBalance: 0
		});
	});

	it('should return a list of tokens with usdBalance as prop if exchange data not undefined', () => {
		const newExchanges: ExchangesData = {
			[ICP_TOKEN.id]: { usd },
			[BTC_MAINNET_TOKEN.id]: { usd }
		};

		const result = pinTokensWithBalanceAtTop({ $tokens, $balances, $exchanges: newExchanges });

		expect(result).toContainEqual({
			...ICP_TOKEN,
			balance: bn1,
			usdBalance: 1
		});
		expect(result).toContainEqual({
			...BTC_MAINNET_TOKEN,
			balance: bn2,
			usdBalance: 2
		});
		expect(result).toContainEqual({
			...ETHEREUM_TOKEN,
			balance: bn3,
			usdBalance: undefined
		});
	});

	it('should pin tokens with usd balance at the top', () => {
		const newBalances: CertifiedStoreData<BalancesData> = {
			[ICP_TOKEN.id]: { data: bn2, certified },
			[BTC_MAINNET_TOKEN.id]: { data: bn1, certified },
			[ETHEREUM_TOKEN.id]: { data: bn3, certified }
		};

		const result = pinTokensWithBalanceAtTop({ $tokens, $balances: newBalances, $exchanges });

		expect(result.map((token) => token.id)).toEqual([
			ETHEREUM_TOKEN.id,
			ICP_TOKEN.id,
			BTC_MAINNET_TOKEN.id
		]);
	});

	it('should return the same array if no tokens have balance', () => {
		const newBalances: CertifiedStoreData<BalancesData> = {
			[ICP_TOKEN.id]: { data: ZERO, certified },
			[BTC_MAINNET_TOKEN.id]: { data: ZERO, certified },
			[ETHEREUM_TOKEN.id]: { data: ZERO, certified }
		};

		const result = pinTokensWithBalanceAtTop({ $tokens, $balances: newBalances, $exchanges });

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

		const result = pinTokensWithBalanceAtTop({ $tokens, $balances: newBalances, $exchanges });

		expect(result.map((token) => token.id)).toEqual([
			BTC_MAINNET_TOKEN.id,
			ICP_TOKEN.id,
			ETHEREUM_TOKEN.id
		]);
	});

	it('should put tokens with no exchange data after tokens with balance', () => {
		const $balances: CertifiedStoreData<BalancesData> = {
			[BTC_MAINNET_TOKEN.id]: { data: bn1, certified },
			[ETHEREUM_TOKEN.id]: { data: bn3, certified }
		};

		const result = pinTokensWithBalanceAtTop({ $tokens, $balances, $exchanges });

		expect(result.map((token) => token.id)).toEqual([
			ETHEREUM_TOKEN.id,
			BTC_MAINNET_TOKEN.id,
			ICP_TOKEN.id
		]);
	});
});
