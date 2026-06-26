import type {
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
