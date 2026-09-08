import type {
	OrderBookDepth,
	Side,
	TradingPairInfo
} from '$declarations/oisy_trade/oisy_trade.did';

/**
 * What a quote needs: the pair, which way round, how much the caller is spending,
 * and the book to answer against.
 *
 * Shaped as the request record a future `quote_swap` endpoint on `oisy_trade` would
 * take, minus `depth` — the canister would read the book itself rather than being
 * handed it. See the README for why that difference is the point.
 */
export interface OisyTradeOfferRequest {
	pair: TradingPairInfo;
	/** The venue's own variant, so this module never invents a side vocabulary. */
	side: Side;
	/**
	 * What the caller is spending, in **source**-token smallest units: base units on
	 * a Sell, quote units on a Buy.
	 */
	sourceAmount: bigint;
	/** A price-aggregated snapshot: `bids` price-descending, `asks` price-ascending. */
	depth: OrderBookDepth;
}

/**
 * Why no order is offerable. Venue vocabulary, deliberately not the Swap form's
 * `FieldErrorKind` — the mapping onto that lives in the swap adapter.
 */
export type OisyTradeOfferRejection =
	/** The opposite side is empty, or too thin to fill the order outright. */
	| 'no_liquidity'
	/** The orderable quantity floors to zero: the amount does not buy one lot. */
	| 'below_lot'
	/** Gross notional under the pair's floor. */
	| 'below_min_notional'
	/** Gross notional over the pair's ceiling. */
	| 'above_max_notional';

/** A fill-or-kill order the book is certain to fill, and what it is certain to produce. */
export interface OisyTradeOffer {
	/**
	 * Limit price, in quote smallest units per one whole base token. Always a price
	 * read off the book, so it is a valid `tick_size` multiple by construction.
	 */
	price: bigint;
	/** Order quantity, in base smallest units, a multiple of `lot_size`. */
	quantity: bigint;
	/**
	 * What the order reserves, in **source**-token smallest units — the quantity on a
	 * Sell, the reserve at the limit price on a Buy. Never more than `sourceAmount`,
	 * so the unorderable remainder stays with the caller.
	 */
	deposit: bigint;
	/**
	 * The **minimum** the order produces, in **destination**-token smallest units,
	 * before the taker fee and any ledger fee. Fills use maker prices, so the real
	 * proceeds of a Sell can exceed this; a Buy receives exactly this many base
	 * tokens and gets the unspent reserve back.
	 */
	gross: bigint;
}

export type OisyTradeOfferResult =
	{ ok: true; offer: OisyTradeOffer } | { ok: false; reason: OisyTradeOfferRejection };
