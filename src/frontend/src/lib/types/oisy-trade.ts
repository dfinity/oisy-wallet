import type {
	OrderBookDepth,
	OrderBookTicker,
	Token,
	TradingPairInfo,
	UserOrder,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';
import type { IcToken } from '$icp/types/ic-token';

// Read-side state loaded from the OISY TRADE canister and held in the store.
// `undefined` = not loaded yet (distinct from an empty list).
export interface OisyTradeStoreData {
	pairs: TradingPairInfo[] | undefined;
	supportedTokens: Token[] | undefined;
	balances: UserTokenBalance[] | undefined;
	orders: UserOrder[] | undefined;
}

// One of the caller's orders resolved to OISY tokens, with amounts in human
// units, ready to render in the Orders Active/History list.
export interface OisyTradeOrderView {
	id: string;
	side: 'buy' | 'sell';
	base: IcToken;
	quote: IcToken;
	// Order quantity in whole base tokens.
	quantity: number;
	// Limit price in whole quote tokens per one whole base token.
	price: number;
	// Cumulative filled quantity in whole base tokens.
	filledQuantity: number;
	status: OisyTradeOrderStatus;
}

// The five candid `OrderStatus` discriminants, flattened to a string union.
export type OisyTradeOrderStatus = 'Pending' | 'Open' | 'Filled' | 'Canceled' | 'Expired';

// Display-only status: an Open order that has already partially filled is shown
// as "Partial" (still active). Not a candid discriminant.
export type OisyTradeOrderDisplayStatus = OisyTradeOrderStatus | 'Partial';

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

// A DEX balance entry paired with the resolved OISY token (for the logo,
// network, decimals and exchange rate the wallet already knows about). Used to
// open the Withdraw flow with the token pre-selected.
export interface OisyTradeWithdrawToken {
	token: IcToken;
	free: bigint;
	reserved: bigint;
}

// Live, per-pair order-book snapshot kept fresh while the limit-order form is
// open. Keyed by the pair's symbol pair (e.g. "ICP/ckUSDC"). `undefined` = not
// loaded yet for that pair.
export interface OisyTradeOrderBook {
	ticker: OrderBookTicker | undefined;
	depth: OrderBookDepth | undefined;
}

// Live, per-pair order-book snapshot kept fresh while the limit-order form is
// open. Keyed by the pair's symbol pair (e.g. "ICP/ckUSDC"). `undefined` = not
// loaded yet for that pair.
export interface OisyTradeOrderBook {
	ticker: OrderBookTicker | undefined;
	depth: OrderBookDepth | undefined;
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

// A DEX balance entry paired with the resolved OISY token (for the logo,
// network, decimals and exchange rate the wallet already knows about). Used to
// open the Withdraw flow with the token pre-selected.
export interface OisyTradeWithdrawToken {
	token: IcToken;
	free: bigint;
	reserved: bigint;
}
