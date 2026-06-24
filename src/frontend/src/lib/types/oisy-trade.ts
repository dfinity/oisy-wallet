import type {
	OrderBookDepth,
	OrderBookTicker,
	Token,
	TradingPairInfo,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';

// Read-side state loaded from the OISY TRADE canister and held in the store.
// `undefined` = not loaded yet (distinct from an empty list).
export interface OisyTradeStoreData {
	pairs: TradingPairInfo[] | undefined;
	supportedTokens: Token[] | undefined;
	balances: UserTokenBalance[] | undefined;
}

// Live, per-pair order-book snapshot kept fresh while the limit-order form is
// open. Keyed by the pair's symbol pair (e.g. "ICP/ckUSDC"). `undefined` = not
// loaded yet for that pair.
export interface OisyTradeOrderBook {
	ticker: OrderBookTicker | undefined;
	depth: OrderBookDepth | undefined;
}
