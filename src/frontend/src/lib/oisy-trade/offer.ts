import type { PriceLevel } from '$declarations/oisy_trade/oisy_trade.did';
import { ZERO } from '$lib/constants/app.constants';
import type {
	OisyTradeOfferRejection,
	OisyTradeOfferRequest,
	OisyTradeOfferResult
} from '$lib/oisy-trade/types';
import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';

const reject = (reason: OisyTradeOfferRejection): OisyTradeOfferResult => ({ ok: false, reason });

const floorToLot = ({ value, lotSize }: { value: bigint; lotSize: bigint }): bigint =>
	value - (value % lotSize);

/**
 * The price at which the book can absorb `quantity` base tokens outright.
 *
 * Walks the bids (price-descending) accumulating quantity, and returns the price of
 * the level that completes the order. That is the *highest* price the whole quantity
 * can still find a counterparty at: any higher and part of it goes unmatched, which
 * for a fill-or-kill order means the entire order is killed.
 */
const priceCoveringQuantity = ({
	bids,
	quantity
}: {
	bids: PriceLevel[];
	quantity: bigint;
}): bigint | undefined => {
	let cumulative = ZERO;

	for (const level of bids) {
		cumulative += level.quantity;

		if (cumulative >= quantity) {
			return level.price;
		}
	}

	return undefined;
};

/**
 * The price at which the book's cumulative value covers `sourceAmount` quote tokens.
 *
 * Walks the asks (price-ascending) accumulating each level's value and returns the
 * price of the level that covers the spend.
 *
 * Accumulates `price × quantity` — value scaled by `10^baseDecimals` — and compares
 * against a likewise-scaled target, rather than reducing each level to quote units
 * first: a per-level floor would under-count the book's capacity by up to one quote
 * unit per level, and could report a book too thin when it is not.
 */
const priceCoveringValue = ({
	asks,
	scaledTarget
}: {
	asks: PriceLevel[];
	scaledTarget: bigint;
}): bigint | undefined => {
	let cumulative = ZERO;

	for (const level of asks) {
		cumulative += level.price * level.quantity;

		if (cumulative >= scaledTarget) {
			return level.price;
		}
	}

	return undefined;
};

/**
 * What acquiring `quantity` base tokens costs at the book's own prices, scaled by
 * `10^baseDecimals`.
 *
 * The engine matches from the best price outwards, so this is the **cheapest** the
 * fill can be — and therefore, subtracted from what the order reserves, the *most*
 * of that reserve the venue can hand back. Settlement needs that bound: the free
 * balance it reads is account-wide, so without one it cannot tell a released reserve
 * from any other credit that landed on the same leg.
 *
 * Nothing when the levels cannot supply the quantity, which is unreachable for a
 * quantity this module derived: the price walk stopped at a level whose cumulative
 * value already covers the spend, and every level up to it is priced at or below
 * that limit, so those levels hold at least `quantity`.
 */
const sweptValue = ({
	levels,
	quantity
}: {
	levels: PriceLevel[];
	quantity: bigint;
}): bigint | undefined => {
	let remaining = quantity;
	let scaled = ZERO;

	for (const level of levels) {
		const taken = level.quantity < remaining ? level.quantity : remaining;

		scaled += level.price * taken;
		remaining -= taken;

		if (remaining <= ZERO) {
			return scaled;
		}
	}

	return undefined;
};

/**
 * Quotes a fill-or-kill order against an order-book snapshot.
 *
 * Both sides run the same walk — accumulate levels until the order is covered, take
 * the price of the last one — because that last price is the worst price the order
 * can accept and still be certain to fill. What differs is what accumulates, and
 * what is then derived:
 *
 * - a **Sell** knows its quantity (the caller spends the base token outright), so it
 *   accumulates base quantity and derives its proceeds from the price;
 * - a **Buy** knows only its spend, so it accumulates the levels' quote value and
 *   derives its *quantity* from the price — because the canister reserves at the
 *   limit price rather than at the price the order fills for, so a limit of `P` caps
 *   the quantity at `sourceAmount / P` however cheaply it ends up filling.
 *
 * Because the returned price is one the book can absorb the whole order at, the
 * order fills in full and `gross` is a floor rather than an estimate. The caller may
 * receive more (a Sell sweeping levels better than its limit) but never less.
 *
 * Returns a reason rather than throwing when there is simply no offerable order — a
 * book too thin, an amount below one lot, a notional outside the pair's bounds.
 */
export const calculateOisyTradeOffer = ({
	pair,
	side,
	sourceAmount,
	depth
}: OisyTradeOfferRequest): OisyTradeOfferResult => {
	// A pair whose grid is non-positive is malformed, not merely unquotable: the
	// canister guarantees both are positive, and dividing by either would surface as
	// an opaque RangeError rather than as the bad input it is.
	if (pair.lot_size <= ZERO) {
		throw new Error(`OISY Trade pair has a non-positive lot size: ${pair.lot_size}`);
	}

	if (sourceAmount <= ZERO) {
		return reject('below_lot');
	}

	const isSell = 'Sell' in side;
	const baseUnit = 10n ** BigInt(pair.base.metadata.decimals);

	// A Sell spends the base token outright, so its quantity is on the lot grid
	// before the walk begins — and is what the walk has to cover. Zero on a Buy,
	// where the quantity is not knowable until the price is.
	const sellQuantity = isSell ? floorToLot({ value: sourceAmount, lotSize: pair.lot_size }) : ZERO;

	// Ahead of the walk, so an amount that cannot fill a single lot names the lot
	// whatever the book holds. Asking afterwards would let an empty opposite side
	// rename the reason to `no_liquidity`, which the caller cannot act on.
	if (isSell && sellQuantity <= ZERO) {
		return reject('below_lot');
	}

	const price = isSell
		? priceCoveringQuantity({ bids: depth.bids, quantity: sellQuantity })
		: priceCoveringValue({ asks: depth.asks, scaledTarget: sourceAmount * baseUnit });

	if (isNullish(price)) {
		return reject('no_liquidity');
	}

	if (price <= ZERO) {
		throw new Error('OISY Trade order book returned a non-positive price level');
	}

	// A Buy's quantity is what the spend affords at the limit price, on the lot grid
	// — inverting the did's `notional = price × quantity / 10^base_decimals`.
	const quantity = isSell
		? sellQuantity
		: floorToLot({ value: (sourceAmount * baseUnit) / price, lotSize: pair.lot_size });

	if (quantity <= ZERO) {
		return reject('below_lot');
	}

	// Gross, and the value the pair's bounds are measured against — the did's own
	// formula, in quote smallest units.
	const notional = (price * quantity) / baseUnit;

	if (notional < pair.min_notional) {
		return reject('below_min_notional');
	}

	const maxNotional = fromNullable(pair.max_notional);

	if (nonNullish(maxNotional) && notional > maxNotional) {
		return reject('above_max_notional');
	}

	// Only levels at or below the limit can match, and a price-aggregated depth lists
	// each price once, so this is exactly the prefix the fill sweeps.
	const swept = isSell
		? ZERO
		: sweptValue({ levels: depth.asks.filter((level) => level.price <= price), quantity });

	if (isNullish(swept)) {
		return reject('no_liquidity');
	}

	return {
		ok: true,
		offer: {
			price,
			quantity,
			// Deposit exactly what the order reserves, in source units. The remainder of
			// an off-grid amount never leaves the caller's wallet, where it costs no
			// ledger fee and needs no withdrawal.
			deposit: isSell ? quantity : notional,
			// A Sell is paid in the quote token, a Buy receives the base token itself.
			gross: isSell ? notional : quantity,
			// A Sell's reserve is the quantity itself and a full fill transfers all of it,
			// so nothing can come back. A Buy reserves at its limit and fills at the
			// book's, and the difference is released. The division floors the cost, which
			// can overstate the release by under one quote unit — harmless, since
			// settlement takes the lesser of this and the credit it measures.
			maxSourceRelease: isSell ? ZERO : notional - swept / baseUnit
		}
	};
};
