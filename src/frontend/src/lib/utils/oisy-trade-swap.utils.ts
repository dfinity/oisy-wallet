import type { OrderBookDepth, TradingPairInfo } from '$declarations/oisy_trade/oisy_trade.did';
import { calculateOisyTradeOffer } from '$lib/oisy-trade';
import type { OisyTradeResolvedOrder } from '$lib/types/oisy-trade-swap';
import type { SwapCategorizedTokenIds } from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import {
	toCandidSide,
	toTradingPair,
	type FieldErrorKind,
	type LimitOrderSide
} from '$lib/utils/oisy-trade.utils';
import { resolveSwapTokenLookup } from '$lib/utils/swap-tokens-filter.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

/**
 * Adapter from the swap flow onto the shipped Trading helpers — deliberately
 * thin. The grid arithmetic (lot multiples, tick alignment, notional bounds)
 * lives in `oisy-trade.utils.ts` and is reached through it, never reimplemented:
 * the Swap and Limit Order surfaces have to agree about what is orderable, and a
 * divergence would only show up for amounts near a boundary.
 *
 * Every function takes the pair table as an argument rather than reading the
 * store, so they stay pure and testable — a store-reading util would see an
 * empty table in every vitest run. Chain Fusion made the same choice.
 */

// The ledger-id text of a pair leg. Must stay in the identifier space
// `resolveSwapTokenLookup` produces for the `icp` category (an IC token's
// `ledgerCanisterId`), since the registry matches source tokens against this set.
const legLedgerId = (leg: TradingPairInfo['base']): string => leg.id.ledger_id.toText();

const isTrading = ({ status }: TradingPairInfo): boolean => 'Trading' in status;

/**
 * The actively-trading pairs. A `Halted` pair is dropped from both the source set
 * and the destination sets: the canister rejects new orders on it with
 * `TemporaryError: TradingHalted`, so quoting it would offer a swap that cannot
 * execute.
 */
export const toOisyTradePairTable = (pairs: TradingPairInfo[]): TradingPairInfo[] =>
	pairs.filter(isTrading);

/** Every ledger that is a leg of an actively-trading pair, in either position. */
export const oisyTradeSupportedSourceTokens = (table: TradingPairInfo[]): Set<string> =>
	new Set(table.flatMap((pair) => [legLedgerId(pair.base), legLedgerId(pair.quote)]));

const icpLedgerId = (token: Token): string | undefined => {
	const lookup = resolveSwapTokenLookup({ token });

	return lookup?.category === 'icp' ? lookup.identifier : undefined;
};

/**
 * A source token's valid destinations: its pair counterparts, and only those.
 *
 * Directed, which is why `buildSymmetricSupportedDestinations` cannot serve here
 * — that returns the whole supported-source set, correct for ICPSwap and
 * KongSwap, wrong for a pair table.
 */
export const oisyTradeCompatibleDestinations = ({
	sourceToken,
	table
}: {
	sourceToken: Token;
	table: TradingPairInfo[];
}): SwapCategorizedTokenIds | undefined => {
	const sourceLedgerId = icpLedgerId(sourceToken);

	if (isNullish(sourceLedgerId)) {
		return undefined;
	}

	const counterparts = table.reduce<Set<string>>((acc, pair) => {
		const base = legLedgerId(pair.base);
		const quote = legLedgerId(pair.quote);

		if (base === sourceLedgerId) {
			acc.add(quote);
		} else if (quote === sourceLedgerId) {
			acc.add(base);
		}

		return acc;
	}, new Set());

	return counterparts.size > 0 ? { icp: counterparts } : undefined;
};

/** The pair these two tokens trade on, if any — the guard the execution PR shares. */
export const findOisyTradePair = ({
	sourceToken,
	destinationToken,
	table
}: {
	sourceToken: Token;
	destinationToken: Token;
	table: TradingPairInfo[];
}): TradingPairInfo | undefined => {
	const sourceLedgerId = icpLedgerId(sourceToken);
	const destinationLedgerId = icpLedgerId(destinationToken);

	if (isNullish(sourceLedgerId) || isNullish(destinationLedgerId)) {
		return undefined;
	}

	return table.find((pair) => {
		const base = legLedgerId(pair.base);
		const quote = legLedgerId(pair.quote);

		return (
			(base === sourceLedgerId && quote === destinationLedgerId) ||
			(quote === sourceLedgerId && base === destinationLedgerId)
		);
	});
};

export const isOisyTradePair = (params: {
	sourceToken: Token;
	destinationToken: Token;
	table: TradingPairInfo[];
}): boolean => nonNullish(findOisyTradePair(params));

/**
 * Which side of the pair the source token sits on: spending the base token is a
 * Sell, spending the quote token is a Buy.
 */
export const resolveOisyTradeSide = ({
	sourceToken,
	pair
}: {
	sourceToken: Token;
	pair: TradingPairInfo;
}): LimitOrderSide | undefined => {
	const sourceLedgerId = icpLedgerId(sourceToken);

	if (isNullish(sourceLedgerId)) {
		return undefined;
	}

	if (sourceLedgerId === legLedgerId(pair.base)) {
		return 'sell';
	}

	return sourceLedgerId === legLedgerId(pair.quote) ? 'buy' : undefined;
};

export type OisyTradeOrderResolution =
	| {
			ok: true;
			order: OisyTradeResolvedOrder;
			/**
			 * The minimum the order produces, in destination smallest units, before the
			 * taker fee and the withdrawal ledger fee. The caller nets both off it.
			 */
			gross: bigint;
	  }
	| { ok: false };

/**
 * The typed source amount resolved into a submittable fill-or-kill order.
 *
 * A thin adapter, deliberately: the arithmetic lives in `$lib/oisy-trade`, which
 * knows the venue and nothing else, and this function only decides which side of
 * the pair the source token sits on and re-words the outcome for the Swap form.
 *
 * Nothing here converts a price to a float. Every price the walk can return is one
 * read off the book, so it is already a valid `tick_size` multiple and already in
 * the canister's own units — which is what retired the float round-trip this
 * function used to carry, along with the `validateAmount` call that needed it. That
 * call had also become redundant: no caller ever passed `freeBalance`, so its
 * affordability leg never fired, and its two grid checks are now made exactly, in
 * bigint, inside the module.
 *
 * Returns `ok: false` rather than throwing when the amount is not orderable —
 * OISY Trade simply contributes no offer. The module's reason is deliberately not
 * carried across: nothing downstream of the fan-out can read one, and the form
 * derives its own explanation from the pair (`oisyTradeAmountObjection`), which is
 * the only one it can reach without awaiting the book.
 */
export const resolveOisyTradeOrder = ({
	sourceToken,
	amount,
	depth,
	pair
}: {
	sourceToken: Token;
	// Source-token smallest units, as the quote fan-out carries it.
	amount: bigint;
	// The book the order will cross, as `get_order_book_depth` returned it.
	depth: OrderBookDepth;
	pair: TradingPairInfo;
}): OisyTradeOrderResolution => {
	const side = resolveOisyTradeSide({ sourceToken, pair });

	if (isNullish(side)) {
		return { ok: false };
	}

	const result = calculateOisyTradeOffer({
		pair,
		side: toCandidSide(side),
		sourceAmount: amount,
		depth
	});

	if (!result.ok) {
		return { ok: false };
	}

	const { price, quantity, deposit, gross } = result.offer;

	return {
		ok: true,
		order: {
			side,
			pair: toTradingPair(pair),
			price,
			quantity,
			depositAmount: deposit
		},
		gross
	};
};

/** The candid `Side` for a resolved order, re-exported so callers need one import. */
export const toOisyTradeCandidSide = toCandidSide;

/**
 * Why a typed amount can never yield an OISY Trade order, judged from the pair
 * alone — for the form's empty-offer-list explanation.
 *
 * Deliberately **not** the full walk. Naming the reason is a synchronous question
 * (`$derived.by` cannot await) and the answer has to survive without an order-book
 * snapshot, so this reports only the two objections a pair settles on its own, and
 * both are certain rather than likely:
 *
 * - a **Sell** below one lot floors to a zero quantity, whatever the book says;
 * - a **Buy** spending less than `min_notional` cannot clear the floor either, since
 *   an order's notional is its reserve and the reserve never exceeds the spend.
 *
 * They are also the only two objections a user can act on: both say "type more".
 * Every other absence — a book too thin, a notional that only binds once the price
 * is known — depends on the book, so it returns `undefined` and the form falls back
 * to the generic "swap is not offered", which is true and needs no new copy.
 *
 * Where both bind at once the module may name the lot and this the notional. Both
 * statements are true and both point the same way, and the notional is the one the
 * user can satisfy with certainty, so it wins here.
 *
 * The return type is narrowed to the two kinds this can actually reach, rather
 * than the whole of `FieldErrorKind`: `max_notional` needs a price and so a book,
 * and `balance` cannot arise at quote time. Narrowing keeps the caller's message
 * switch from carrying branches nothing can select — and, being an `Extract`, it
 * fails to compile if either member is ever renamed out of the shared union.
 */
export const oisyTradeAmountObjection = ({
	sourceToken,
	amount,
	pair
}: {
	sourceToken: Token;
	amount: bigint;
	pair: TradingPairInfo;
}): Extract<FieldErrorKind, 'lot' | 'min_notional'> | undefined => {
	const side = resolveOisyTradeSide({ sourceToken, pair });

	if (isNullish(side)) {
		return undefined;
	}

	if (side === 'sell') {
		return amount < pair.lot_size ? 'lot' : undefined;
	}

	return amount < pair.min_notional ? 'min_notional' : undefined;
};
