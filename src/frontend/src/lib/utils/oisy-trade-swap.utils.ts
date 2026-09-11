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
	toTradingPair,
	validateAmount,
	type FieldErrorKind,
	type LimitOrderSide
} from '$lib/utils/oisy-trade.utils';
import { resolveSwapTokenLookup } from '$lib/utils/swap-tokens-filter.utils';
import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';

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
 * Every value the canister will check — the quantity, the price and the notional
 * — is derived in **bigint**, and the three grid rules are re-checked exactly
 * against the pair's own base-unit steps after `validateAmount` has had its say.
 *
 * That exactness is not belt-and-braces. `validateAmount` and its helpers work in
 * the human float domain, which is safe for 6- and 8-decimal tokens but not for
 * 18: converting base units to a human float and back is not an identity, and
 * `isMultipleOfStep` allows a 1e-6 *relative* tolerance, which for an 18-decimal
 * token is ~1e9 base units of slack. Measured, 7.3% of on-grid ckETH amounts —
 * starting at 0.009 ckETH — came back from the float round-trip one base unit off
 * the lot grid while still passing the float check. The canister rejects such an
 * order with `InvalidQuantity`, and it does so *after* `deposit` has already moved
 * the funds into DEX custody, so a float verdict here is a stranded-funds bug
 * rather than a rounding curiosity. The shipped Limit Order form has the same
 * float round-trip, but nothing precedes its `add_limit_order`, so there the same
 * rejection costs nothing.
 *
 * `validateAmount` is still the gate for affordability and for the `errorKind`
 * precedence the form's messages depend on, so the two surfaces cannot disagree
 * about *why* an amount is unorderable — only about the last base unit, where this
 * one is right.
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

	const priceUnits = toPriceUnits({
		price: tickedPrice,
		quoteDecimals: pairView.quoteDecimals
	});

	if (priceUnits <= ZERO || priceUnits % pair.tick_size !== ZERO) {
		return { ok: false };
	}

	const baseUnit = 10n ** BigInt(pairView.baseDecimals);

	// A Sell spends the base token outright, so the typed amount *is* the quantity —
	// no conversion, and so no rounding residue at all. A Buy's quantity is derived
	// (the base amount its quote spend affords at the limit price), which the user
	// cannot control by typing, so only there is it floored to the grid and the
	// deposit shrunk to the order's reserve. Inverting the did's
	// `notional = price × quantity / 10^base_decimals` gives the affordable quantity.
	const rawQuantity = side === 'sell' ? amount : (amount * baseUnit) / priceUnits;
	const quantity = side === 'sell' ? rawQuantity : rawQuantity - (rawQuantity % pair.lot_size);

	if (quantity <= ZERO) {
		return { ok: false, errorKind: 'lot' };
	}

	// In quote smallest units. Exact, and the same value the Buy path deposits.
	const notional = (priceUnits * quantity) / baseUnit;

	const { ok, errorKind } = validateAmount({
		side,
		baseAmount: Number(quantity) / 10 ** pairView.baseDecimals,
		price: tickedPrice,
		freeBalance: freeBalance ?? Number.POSITIVE_INFINITY,
		pair: pairView
	});

	if (!ok) {
		return { ok: false, errorKind };
	}

	// The exact re-check of what the canister enforces. A float verdict can accept
	// each of these for an 18-decimal token — see the note above — and every
	// rejection here would otherwise land after the deposit.
	if (quantity % pair.lot_size !== ZERO) {
		return { ok: false, errorKind: 'lot' };
	}

	if (notional < pair.min_notional) {
		return { ok: false, errorKind: 'min_notional' };
	}

	const maxNotional = fromNullable(pair.max_notional);

	if (nonNullish(maxNotional) && notional > maxNotional) {
		return { ok: false, errorKind: 'max_notional' };
	}

	return {
		ok: true,
		order: {
			side,
			pair: toTradingPair(pair),
			price: priceUnits,
			quantity,
			depositAmount: side === 'sell' ? quantity : notional
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
