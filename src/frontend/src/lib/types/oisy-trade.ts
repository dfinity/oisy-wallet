import type {
	Token,
	TradingPairInfo,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';
import type { IcToken } from '$icp/types/ic-token';

// Read-side state loaded from the OISY TRADE canister and held in the store.
// `undefined` = not loaded yet (distinct from an empty list).
export interface OisyTradeStoreData {
	pairs: TradingPairInfo[] | undefined;
	supportedTokens: Token[] | undefined;
	balances: UserTokenBalance[] | undefined;
}

// A DEX balance entry resolved to the matching OISY token, ready for display in
// the Trading tab "My assets" section.
export interface OisyTradeAsset {
	token: IcToken;
	// Funds available for new orders or withdrawal.
	free: bigint;
	// Funds locked by open orders.
	reserved: bigint;
	// `free + reserved` — the total deposited on the DEX.
	total: bigint;
	// Fiat value of `total`, or undefined when no exchange rate is available.
	totalUsd: number | undefined;
	// Fiat value of `free`, or undefined when no exchange rate is available.
	freeUsd: number | undefined;
}
