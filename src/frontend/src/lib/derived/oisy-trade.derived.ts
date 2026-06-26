import type {
	Token,
	TradingPairInfo,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';
import { oisyTradeStore } from '$lib/stores/oisy-trade.store';
import { derived, type Readable } from 'svelte/store';

export const oisyTradePairs: Readable<TradingPairInfo[]> = derived(
	oisyTradeStore,
	({ pairs }) => pairs ?? []
);

export const oisyTradeSupportedTokens: Readable<Token[]> = derived(
	oisyTradeStore,
	({ supportedTokens }) => supportedTokens ?? []
);

export const oisyTradeBalances: Readable<UserTokenBalance[]> = derived(
	oisyTradeStore,
	({ balances }) => balances ?? []
);
