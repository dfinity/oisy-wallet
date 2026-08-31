import type { TradingPairInfo } from '$declarations/oisy_trade/oisy_trade.did';
import { ZERO } from '$lib/constants/app.constants';
import type { OisyTradeResolvedOrder } from '$lib/types/oisy-trade-swap';
import type { SwapCategorizedTokenIds } from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import {
	floorToStep,
	toCandidSide,
	toPairView,
	toPriceUnits,
	toQuantity,
	toTradingPair,
	validateAmount,
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
	{ ok: true; order: OisyTradeResolvedOrder } | { ok: false; errorKind?: FieldErrorKind };

/**
 * The typed source amount resolved into a submittable fill-or-kill order.
 *
 * Works in the human float domain and converts at the candid boundary, exactly
 * as `LimitOrderWizard.place()` already ships: the quantity ends up on the lot
 * grid (validated on a Sell, floored on a Buy) and the price snapped to the
 * tick grid, so both carry at most `decimalsOfStep(step)` decimal places. Only
 * the Buy-side reserve is computed in bigint, because it is an exact base-unit
 * quantity the canister enforces.
 *
 * Returns `ok: false` rather than throwing when the amount is not orderable —
 * OISY Trade simply contributes no offer, and `errorKind` lets the form name the
 * reason when no other provider quoted either.
 */
export const resolveOisyTradeOrder = ({
	sourceToken,
	amount,
	price,
	freeBalance,
	pair
}: {
	sourceToken: Token;
	// Source-token smallest units, as the quote fan-out carries it.
	amount: bigint;
	// Human quote-per-whole-base rate. Snapped to the tick grid here.
	price: number;
	/**
	 * Human source-token balance the order has to fit inside.
	 *
	 * Optional because the quote path has no balance to offer — `SwapQuoteParams`
	 * carries only the identity, the two tokens and the amount. Left unset, the
	 * affordability leg of `validateAmount` is a no-op and only the grid rules
	 * apply, which is also the behaviour the offer list wants: every other provider
	 * quotes an unaffordable amount and lets the form report insufficient funds, so
	 * suppressing the offer here would make OISY Trade blink out where its peers
	 * still appear. Execution passes the real figure.
	 */
	freeBalance?: number;
	pair: TradingPairInfo;
}): OisyTradeOrderResolution => {
	const side = resolveOisyTradeSide({ sourceToken, pair });

	if (isNullish(side)) {
		return { ok: false };
	}

	const pairView = toPairView(pair);
	const tickedPrice = floorToStep({ value: price, step: pairView.tickSize });

	if (!(tickedPrice > 0)) {
		return { ok: false };
	}

	const sourceAmount = Number(amount) / 10 ** sourceToken.decimals;

	// A Sell spends the base token outright, and mirrors the Limit Order form:
	// the typed amount is validated against the lot grid by `validateAmount`
	// below, never rounded — an off-grid amount produces no offer. A Buy's
	// quantity is derived (the base amount its quote spend affords at the limit
	// price), which the user cannot control by typing, so only there is it
	// floored to the grid, and the deposit shrinks to the order's reserve.
	const baseAmount =
		side === 'sell'
			? sourceAmount
			: floorToStep({ value: sourceAmount / tickedPrice, step: pairView.lotSize });

	if (!(baseAmount > 0)) {
		return { ok: false, errorKind: 'lot' };
	}

	const { ok, errorKind } = validateAmount({
		side,
		baseAmount,
		price: tickedPrice,
		freeBalance: freeBalance ?? Number.POSITIVE_INFINITY,
		pair: pairView
	});

	if (!ok) {
		return { ok: false, errorKind };
	}

	const quantity = toQuantity({ baseAmount, baseDecimals: pairView.baseDecimals });
	const priceUnits = toPriceUnits({
		price: tickedPrice,
		quoteDecimals: pairView.quoteDecimals
	});

	// `notional = price × quantity / 10^base_decimals`, in quote smallest units —
	// the did's convention, since a price is quoted per *whole* base token.
	const reserve = (priceUnits * quantity) / 10n ** BigInt(pairView.baseDecimals);

	if (side === 'buy' && !(reserve > ZERO)) {
		return { ok: false, errorKind: 'min_notional' };
	}

	return {
		ok: true,
		order: {
			side,
			pair: toTradingPair(pair),
			price: priceUnits,
			quantity,
			depositAmount: side === 'sell' ? quantity : reserve
		}
	};
};

/** The candid `Side` for a resolved order, re-exported so callers need one import. */
export const toOisyTradeCandidSide = toCandidSide;

/**
 * Placeholder receive amount: the source amount at a 1:1 *human-unit* rate.
 *
 * A decimal rescale, not a copy — `receiveAmount` is in destination base units,
 * so 1 ICP (8 dp) → 1 ckUSDT (6 dp) is `1_000_000`, not `100_000_000`. Passing
 * the bigint through unchanged would be wrong by `10^(dest − source)`.
 *
 * Replaced wholesale by the real order-book walk in its own spec; nothing
 * downstream reads anything but the result, so this is the only function that
 * changes. Multiplication first, integer division last, bigint throughout.
 */
export const computeOisyTradeReceiveAmount = ({
	amount,
	sourceDecimals,
	destinationDecimals
}: {
	amount: bigint;
	sourceDecimals: number;
	destinationDecimals: number;
}): bigint => (amount * 10n ** BigInt(destinationDecimals)) / 10n ** BigInt(sourceDecimals);
