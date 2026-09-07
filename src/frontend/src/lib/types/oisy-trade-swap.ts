import type { TradingPair } from '$declarations/oisy_trade/oisy_trade.did';
import type { ProviderFee } from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import type { FieldErrorKind, LimitOrderSide } from '$lib/utils/oisy-trade.utils';

export const OISY_TRADE_EXTERNAL_REF_KEYS = {
	// The poll key. `get_my_orders` with `ById` is the only settlement oracle,
	// and this is written the moment `add_limit_order` returns.
	ORDER_ID: 'order_id',
	// Proof the deposit landed, and the only thing that separates a row whose
	// deposit stalled from one that never started — the two resolve differently
	// (withdraw and fail, versus delete).
	DEPOSIT_BLOCK_INDEX: 'deposit_block_index',
	// The price and quantity actually submitted, for traceability and for the
	// failure message. Snapshotted rather than re-derived, because the book moves
	// and the row has to keep describing the order the user reviewed.
	ORDER_PRICE: 'order_price',
	ORDER_QUANTITY: 'order_quantity',
	// The destination (or recovered source) withdrawal that closes the row.
	WITHDRAW_BLOCK_INDEX: 'withdraw_block_index',
	// Set when the order has resolved but a non-dust leg is still at the venue because
	// withdrawing it was refused definitively. The row does *not* close on it — it
	// stays non-terminal and the poller keeps retrying — so this is the record that the
	// order's outcome was not the whole story, and it is also what tells the poller the
	// record has already been written, so the write happens once per row rather than
	// once per attempt.
	RESIDUE_STRANDED: 'residue_stranded',
	// Both legs' free DEX balance as it stood *before* the deposit, in base units.
	// Settlement acts on the difference from these, never on the account-wide
	// total: a user can arrive at a swap with either leg already funded from the
	// Trading tab, and those balances are neither this swap's to withdraw nor
	// evidence of how its order resolved. Written at creation, which is already
	// before the first canister call, so they cost no extra ordering.
	//
	// Both are written in that one call, so a row never holds only one of them. A row
	// whose baselines cannot be read is therefore malformed, not early, and the poller
	// declines to settle it rather than substituting zero — which would credit this
	// order with the caller's entire free balance and re-create both harms above.
	BASELINE_SOURCE_FREE: 'baseline_source_free',
	BASELINE_DEST_FREE: 'baseline_dest_free',
	// Display + analytics metadata snapshotted at creation. These reuse OneSec's
	// exact key strings — `ActiveUserTransactionItem` reads *every* row's refs
	// through `toOneSecExternalRefsMap`, so a fifth swap provider renders for free
	// only by speaking the same vocabulary. They stay correct across refresh and
	// cross-session resume, and after the user disables one of the two tokens.
	AMOUNT: 'amount',
	USD_SOURCE_VALUE: 'usd_source_value',
	SOURCE_TOKEN_SYMBOL: 'source_token_symbol',
	SOURCE_NETWORK_SYMBOL: 'source_network_symbol',
	DESTINATION_TOKEN_SYMBOL: 'destination_token_symbol',
	DESTINATION_NETWORK_SYMBOL: 'destination_network_symbol'
} as const;

export type OisyTradeExternalRefKey =
	(typeof OISY_TRADE_EXTERNAL_REF_KEYS)[keyof typeof OISY_TRADE_EXTERNAL_REF_KEYS];

// Deliberately absent: the order side and the pair's base / quote legs. All
// three are fixed at creation and ride in the AUT `data` variant instead —
// `OisyTradeData.side` plus the source and destination tokens determine them
// (`Sell` means base is the source and quote the destination, `Buy` the
// reverse). Writing them as refs as well would be two representations of one
// fact with nothing keeping them agreed.

export type OisyTradeFee = ProviderFee & {
	// i18n path resolved at render time, so the fee list carries no copy itself.
	// Same shape as `ChainFusionFee`, and rendered the same way.
	labelPath: string;
};

/**
 * The order parameters the quote resolved, carried through to execution.
 *
 * Carried in the quote rather than re-derived at submit time on purpose: the
 * quote is what the user reviewed, and re-deriving the price after Review would
 * let the book move underneath them, silently changing what they agreed to.
 * `LimitOrderWizard` freezes its market snapshot at Review for the same reason.
 */
export interface OisyTradeResolvedOrder {
	side: LimitOrderSide;
	pair: TradingPair;
	// Quote-token smallest units per one *whole* base token, on the pair's tick
	// grid — the candid `price` convention, not a human rate.
	price: bigint;
	// Base-token smallest units, a multiple of the pair's lot size.
	quantity: bigint;
	// What the deposit leg actually moves, in *source*-token smallest units:
	// the quantity on a Sell, the order's reserve at the limit price on a Buy.
	// Depositing exactly what the order reserves leaves the unorderable slice of
	// the typed amount in the user's wallet, where it costs no fee and needs no
	// withdrawal.
	depositAmount: bigint;
}

/**
 * What `getQuote` hands back before it becomes a `SwapMappedResult`.
 *
 * The registry's `swapProviders` group splits quoting from mapping, so this is
 * the intermediate — the same split ICPSwap uses, rather than a new shape.
 */
export interface OisyTradeQuote {
	receiveAmount: bigint;
	swapDetails: OisyTradeSwapDetails;
}

/**
 * A quote, or the named reason there is none.
 *
 * The fan-out itself only carries offers — the registry adapter drops the
 * rejection — but `errorKind` maps one-to-one onto the shipped Limit Order i18n
 * copy, and it is what lets the form explain an empty offer list (via
 * `notOfferedExplained` + `message`) instead of the generic "swap is not
 * offered". Rejections without a kind (no pair, halted pair, unknown ledger fee)
 * have nothing user-actionable to say.
 */
export type OisyTradeQuoteResult =
	{ ok: true; quote: OisyTradeQuote } | { ok: false; errorKind?: FieldErrorKind };

export interface OisyTradeSwapDetails {
	// Itemized, never summed: the three fees are denominated in two different
	// tokens, so a single total would be a cross-token addition.
	fees: OisyTradeFee[];
	// The pair's taker rate, in basis points. A fill-or-kill order either crosses
	// the book immediately or is killed, so it can never rest and earn the maker
	// rate — `maker_fee_bps` is irrelevant here and is never displayed.
	takerFeeBps: number;
	// The pair's floor, in quote-token smallest units, with the token it is
	// denominated in. Carried here so the provider sheet renders from the offer
	// alone, like every other `SwapDetails*`, rather than re-reading the pair table.
	minNotional: bigint;
	quoteToken: Token;
	order: OisyTradeResolvedOrder;
}
