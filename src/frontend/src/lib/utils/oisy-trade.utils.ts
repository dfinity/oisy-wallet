import type {
	Token as OisyTradeToken,
	PriceLevel,
	Side,
	TradingPair,
	TradingPairInfo,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';
import type { IcToken } from '$icp/types/ic-token';
import { ZERO } from '$lib/constants/app.constants';
import type { ExchangesData } from '$lib/types/exchange';
import type { OisyTradeAsset } from '$lib/types/oisy-trade';
import { calculateTokenUsdAmount } from '$lib/utils/token.utils';
import { fromNullable, nonNullish } from '@dfinity/utils';

// ---------------------------------------------------------------------------
// Pure helpers backing the limit-order form. Everything user-facing is computed
// from a small, fully-typed numeric view of a `TradingPairInfo` so the logic
// stays unit-testable in isolation from the canister wiring.
//
// Unit conventions (from the oisy-trade candid):
//  - `quantity` is in base-token smallest units.
//  - `price` is in quote-token smallest units per ONE WHOLE base token.
//  - `notional` (order value, quote smallest units) = price × quantity / 10^baseDecimals.
// The form works in human decimals: a "base amount" (whole base tokens) and a
// human "price" (whole quote per whole base). We convert back to the candid's
// smallest-unit grid only to validate the tick/lot/notional multiples exactly.
// ---------------------------------------------------------------------------

export type LimitOrderSide = 'sell' | 'buy';

// Numeric, decimal-domain view of a pair used by the form/derivations.
export interface LimitOrderPairView {
	baseSymbol: string;
	quoteSymbol: string;
	baseDecimals: number;
	quoteDecimals: number;
	// Step sizes expressed in human units.
	lotSize: number; // base step, e.g. 0.25 base
	tickSize: number; // price step, e.g. 0.0005 quote-per-base
	// Order-value bounds in human quote units (null = no upper cap).
	minNotional: number;
	maxNotional: number | null;
	makerFeeBps: number;
	takerFeeBps: number;
}

const pow10 = (decimals: number): number => 10 ** decimals;

// Decimal places implied by a (possibly non-power-of-ten) step. Robust for
// values like 0.25 (→ 2) and exponential notation like "1e-7" (→ 7).
export const decimalsOfStep = (step: number): number => {
	const s = step.toString();
	if (/e/i.test(s)) {
		const [mantissa, exponent] = s.toLowerCase().split('e');
		const mantissaDecimals = mantissa.includes('.') ? mantissa.split('.')[1].length : 0;
		return Math.max(0, mantissaDecimals - parseInt(exponent, 10));
	}
	return s.includes('.') ? s.split('.')[1].length : 0;
};

// True when `value` is a positive integer multiple of `step` (with a small
// tolerance for float drift). Zero/negative are not valid multiples here.
export const isMultipleOfStep = ({ value, step }: { value: number; step: number }): boolean => {
	if (!(value > 0) || !(step > 0)) {
		return false;
	}
	const ratio = value / step;
	return Math.abs(ratio - Math.round(ratio)) < 1e-6;
};

// Largest valid `step` multiple ≤ value (used by the Max links).
export const floorToStep = ({ value, step }: { value: number; step: number }): number => {
	if (!(value > 0) || !(step > 0)) {
		return 0;
	}
	const k = Math.floor(value / step + 1e-9);
	return parseFloat((k * step).toFixed(decimalsOfStep(step)));
};

// Trim a typed string to at most `maxDecimals` fractional digits, dropping any
// non-numeric characters. Mirrors the keystroke-level decimal cap on the field.
export const limitDecimals = ({
	raw,
	maxDecimals
}: {
	raw: string;
	maxDecimals: number;
}): string => {
	const cleaned = raw.replace(/[^0-9.]/g, '');
	const dotIndex = cleaned.indexOf('.');
	if (dotIndex < 0) {
		return cleaned;
	}
	if (maxDecimals === 0) {
		return cleaned.slice(0, dotIndex);
	}
	const fraction = cleaned
		.slice(dotIndex + 1)
		.replace(/\./g, '')
		.slice(0, maxDecimals);
	return `${cleaned.slice(0, dotIndex)}.${fraction}`;
};

// quote = base × price, exact at the limit price. Returns NaN when either input
// is missing/invalid so callers can render "—" rather than a misleading 0.
export const deriveQuoteAmount = ({
	baseAmount,
	price
}: {
	baseAmount: number;
	price: number;
}): number => {
	if (!(baseAmount > 0) || !(price > 0)) {
		return NaN;
	}
	return baseAmount * price;
};

// Order value in human quote units (= base × price). NaN when not derivable.
export const deriveNotional = ({
	baseAmount,
	price
}: {
	baseAmount: number;
	price: number;
}): number => deriveQuoteAmount({ baseAmount, price });

// The token (and free balance) actually spent: base on a Sell, quote on a Buy.
export const spendAmount = ({
	side,
	baseAmount,
	price
}: {
	side: LimitOrderSide;
	baseAmount: number;
	price: number;
}): number => (side === 'sell' ? baseAmount : deriveQuoteAmount({ baseAmount, price }));

// Best book price the order would cross into: the bid on a Sell, the ask on a Buy.
export const crossingReferencePrice = ({
	side,
	bid,
	ask
}: {
	side: LimitOrderSide;
	bid: number | null;
	ask: number | null;
}): number | null => (side === 'sell' ? bid : ask);

// A limit crosses the book (fills immediately) when a Sell sits at/below the
// best bid, or a Buy sits at/above the best ask. With no book on the relevant
// side, nothing can cross.
export const crossesBook = ({
	side,
	price,
	bid,
	ask
}: {
	side: LimitOrderSide;
	price: number;
	bid: number | null;
	ask: number | null;
}): boolean => {
	if (!(price > 0)) {
		return false;
	}
	const reference = crossingReferencePrice({ side, bid, ask });
	if (reference === null) {
		return false;
	}
	return side === 'sell' ? price <= reference : price >= reference;
};

// Signed value-difference (%) of the limit price vs current value. A Sell above
// current value is positive; a Buy below current value is positive.
export const valueDifferencePercent = ({
	side,
	price,
	currentValue
}: {
	side: LimitOrderSide;
	price: number;
	currentValue: number;
}): number => {
	if (!(price > 0) || !(currentValue > 0)) {
		return 0;
	}
	return side === 'sell'
		? (price / currentValue - 1) * 100
		: ((currentValue - price) / currentValue) * 100;
};

export type FieldErrorKind = 'balance' | 'lot' | 'min_notional' | 'max_notional';

export interface AmountValidation {
	ok: boolean;
	errorKind?: FieldErrorKind;
}

// Single amount-field message, in the spec's precedence order:
// (1) exceeds free balance, (2) not a lot multiple, (3) below min_notional,
// (4) above max_notional. Affordability is surfaced before the grid check.
export const validateAmount = ({
	side,
	baseAmount,
	price,
	freeBalance,
	pair
}: {
	side: LimitOrderSide;
	baseAmount: number;
	price: number;
	freeBalance: number;
	pair: LimitOrderPairView;
}): AmountValidation => {
	if (!(baseAmount > 0)) {
		return { ok: false };
	}

	const spend = spendAmount({ side, baseAmount, price });
	if (price > 0 && spend > freeBalance + 1e-9) {
		return { ok: false, errorKind: 'balance' };
	}

	if (!isMultipleOfStep({ value: baseAmount, step: pair.lotSize })) {
		return { ok: false, errorKind: 'lot' };
	}

	if (price > 0) {
		const notional = deriveNotional({ baseAmount, price });
		if (notional < pair.minNotional - 1e-9) {
			return { ok: false, errorKind: 'min_notional' };
		}
		if (pair.maxNotional !== null && notional > pair.maxNotional + 1e-9) {
			return { ok: false, errorKind: 'max_notional' };
		}
	}

	return { ok: true };
};

// Price field carries only the tick-multiple check.
export const validatePrice = ({
	price,
	pair
}: {
	price: number;
	pair: LimitOrderPairView;
}): boolean => isMultipleOfStep({ value: price, step: pair.tickSize });

// Whole-form gate: both fields positive + on their grid + notional in bounds +
// affordable, and — when FOK is on — the price must cross the book (else it
// would be canceled). Mirrors the Review-enable condition.
export const isOrderValid = ({
	side,
	baseAmount,
	price,
	freeBalance,
	pair,
	fillOrKill,
	bid,
	ask
}: {
	side: LimitOrderSide;
	baseAmount: number;
	price: number;
	freeBalance: number;
	pair: LimitOrderPairView;
	fillOrKill: boolean;
	bid: number | null;
	ask: number | null;
}): boolean => {
	if (!(baseAmount > 0) || !(price > 0)) {
		return false;
	}
	if (!validatePrice({ price, pair })) {
		return false;
	}
	if (!validateAmount({ side, baseAmount, price, freeBalance, pair }).ok) {
		return false;
	}
	if (fillOrKill && !crossesBook({ side, price, bid, ask })) {
		return false;
	}
	return true;
};

// Max for the spend side. Sell: free base floored to lot. Buy: free quote
// converted to base via the price, floored to lot (needs a positive price).
export const maxSpendBaseAmount = ({
	side,
	freeBase,
	freeQuote,
	price,
	pair
}: {
	side: LimitOrderSide;
	freeBase: number;
	freeQuote: number;
	price: number;
	pair: LimitOrderPairView;
}): number | null => {
	if (side === 'sell') {
		return floorToStep({ value: freeBase, step: pair.lotSize });
	}
	if (!(price > 0)) {
		return null;
	}
	return floorToStep({ value: freeQuote / price, step: pair.lotSize });
};

// ---------------------------------------------------------------------------
// Presets — value-anchored (oisy feed) except the leftmost Bid/Ask, which is
// book-anchored. Sell offsets are positive, Buy offsets negative.
// ---------------------------------------------------------------------------

export type PricePreset = 'book' | 0 | 1 | 5;

const snapToTick = ({ price, tickSize }: { price: number; tickSize: number }): number =>
	parseFloat((Math.round(price / tickSize) * tickSize).toFixed(decimalsOfStep(tickSize)));

// The price a preset would set right now, snapped to the tick. Returns null
// when the inputs needed for that preset are unavailable.
export const presetTargetPrice = ({
	preset,
	side,
	currentValue,
	bid,
	ask,
	tickSize
}: {
	preset: PricePreset;
	side: LimitOrderSide;
	currentValue: number;
	bid: number | null;
	ask: number | null;
	tickSize: number;
}): number | null => {
	if (!(tickSize > 0)) {
		return null;
	}
	let raw: number | null;
	if (preset === 'book') {
		raw = crossingReferencePrice({ side, bid, ask });
	} else if (preset === 0) {
		raw = currentValue > 0 ? currentValue : null;
	} else {
		if (!(currentValue > 0)) {
			return null;
		}
		const sign = side === 'sell' ? 1 : -1;
		raw = currentValue * (1 + (sign * preset) / 100);
	}
	if (raw === null || !(raw > 0)) {
		return null;
	}
	return snapToTick({ price: raw, tickSize });
};

// A preset reads "selected" only while the price still equals its target; a
// market move or manual edit deselects it.
export const isPresetSelected = ({
	preset,
	price,
	side,
	currentValue,
	bid,
	ask,
	tickSize
}: {
	preset: PricePreset;
	price: number;
	side: LimitOrderSide;
	currentValue: number;
	bid: number | null;
	ask: number | null;
	tickSize: number;
}): boolean => {
	if (!(price > 0)) {
		return false;
	}
	const target = presetTargetPrice({ preset, side, currentValue, bid, ask, tickSize });
	return target !== null && Math.abs(price - target) <= tickSize / 2;
};

// ---------------------------------------------------------------------------
// Queue position — share of same-side base volume priced strictly better than
// the user's price (asks below a Sell, bids above a Buy). An approximation of
// FIFO position: the aggregated depth endpoint can't see intra-level order.
// ---------------------------------------------------------------------------

export const queuePositionFraction = ({
	side,
	price,
	tickSize,
	asks,
	bids
}: {
	side: LimitOrderSide;
	price: number;
	tickSize: number;
	// Levels in human units (price per base, quantity in base).
	asks: { price: number; quantity: number }[];
	bids: { price: number; quantity: number }[];
}): number | null => {
	if (!(price > 0)) {
		return null;
	}
	const levels = side === 'sell' ? asks : bids;
	const total = levels.reduce((sum, level) => sum + level.quantity, 0);
	if (total <= 0) {
		return null;
	}
	const epsilon = tickSize / 2;
	const ahead = levels
		.filter((level) =>
			side === 'sell' ? level.price < price - epsilon : level.price > price + epsilon
		)
		.reduce((sum, level) => sum + level.quantity, 0);
	return ahead / total;
};

// 0 → "Front of book"; < 10% → one decimal, always rounded UP (so any volume
// ahead reads ≥ 0.1%, never a misleading 0%); ≥ 10% → whole number.
export interface QueuePositionDisplay {
	front: boolean;
	percent: number; // 0 when front
}

export const queuePositionDisplay = (fraction: number | null): QueuePositionDisplay | null => {
	if (fraction === null) {
		return null;
	}
	const pct = fraction * 100;
	if (pct <= 0) {
		return { front: true, percent: 0 };
	}
	if (pct < 10) {
		return { front: false, percent: Math.ceil(pct * 10) / 10 };
	}
	return { front: false, percent: Math.round(pct) };
};

// ---------------------------------------------------------------------------
// Fees — the API value is in basis points; oisy always displays a percentage.
// ---------------------------------------------------------------------------

export const feeBpsToPercent = (bps: number): number => bps / 100;

// ---------------------------------------------------------------------------
// Candid <-> view conversions.
// ---------------------------------------------------------------------------

// Build the numeric form view from a candid `TradingPairInfo`. Step sizes and
// notional bounds are stored in smallest units; we scale them to human units.
export const toPairView = (info: TradingPairInfo): LimitOrderPairView => {
	const baseDecimals = info.base.metadata.decimals;
	const quoteDecimals = info.quote.metadata.decimals;
	const maxNotional = fromNullable(info.max_notional);

	return {
		baseSymbol: info.base.metadata.symbol,
		quoteSymbol: info.quote.metadata.symbol,
		baseDecimals,
		quoteDecimals,
		// lot_size is base smallest units → human base.
		lotSize: Number(info.lot_size) / pow10(baseDecimals),
		// tick_size is quote smallest units per whole base → human quote-per-base.
		tickSize: Number(info.tick_size) / pow10(quoteDecimals),
		// notional bounds are quote smallest units → human quote.
		minNotional: Number(info.min_notional) / pow10(quoteDecimals),
		maxNotional: nonNullish(maxNotional) ? Number(maxNotional) / pow10(quoteDecimals) : null,
		makerFeeBps: info.maker_fee_bps,
		takerFeeBps: info.taker_fee_bps
	};
};

// Candid `TradingPair` (base/quote ledger principals) from a pair info.
export const toTradingPair = (info: TradingPairInfo): TradingPair => ({
	base: info.base.id.ledger_id,
	quote: info.quote.id.ledger_id
});

// Convert a human base amount to the candid `quantity` (base smallest units).
export const toQuantity = ({
	baseAmount,
	baseDecimals
}: {
	baseAmount: number;
	baseDecimals: number;
}): bigint => BigInt((baseAmount * pow10(baseDecimals)).toFixed(0));

// Convert a human price (quote per whole base) to the candid `price`
// (quote smallest units per whole base).
export const toPriceUnits = ({
	price,
	quoteDecimals
}: {
	price: number;
	quoteDecimals: number;
}): bigint => BigInt((price * pow10(quoteDecimals)).toFixed(0));

// Candid `Side` from the form side.
export const toCandidSide = (side: LimitOrderSide): Side =>
	side === 'sell' ? { Sell: null } : { Buy: null };

// A `PriceLevel` price scaled to human quote-per-base.
export const priceLevelToHuman = ({
	level,
	baseDecimals,
	quoteDecimals
}: {
	level: PriceLevel;
	baseDecimals: number;
	quoteDecimals: number;
}): { price: number; quantity: number } => ({
	price: Number(level.price) / pow10(quoteDecimals),
	quantity: Number(level.quantity) / pow10(baseDecimals)
});

// The distinct union of every base and quote token symbol across the trading
// pairs — the set of tokens OISY TRADE supports. Used for the onboarding chips
// and the deposit "nothing to deposit" empty state.
export const oisyTradeSupportedTokenSymbols = (pairs: TradingPairInfo[]): string[] => [
	...new Set(pairs.flatMap(({ base, quote }) => [base.metadata.symbol, quote.metadata.symbol]))
];

// Resolves the DEX balances (keyed by ledger canister principal) to OISY tokens
// and enriches them with totals and fiat values. Balances whose ledger we don't
// know are dropped — we can't render a row without the token's metadata/icon.
export const mapOisyTradeAssets = ({
	balances,
	tokens,
	exchanges
}: {
	balances: UserTokenBalance[];
	tokens: IcToken[];
	exchanges: ExchangesData;
}): OisyTradeAsset[] => {
	const tokenByLedgerId = new Map(tokens.map((token) => [token.ledgerCanisterId, token]));

	return balances.reduce<OisyTradeAsset[]>((acc, { token: dexToken, balance }) => {
		const token = tokenByLedgerId.get(dexToken.id.ledger_id.toText());

		if (token === undefined) {
			return acc;
		}

		const { free, reserved } = balance;
		const total = free + reserved;

		acc.push({
			token,
			free,
			reserved,
			total,
			totalUsd: calculateTokenUsdAmount({ amount: total, token, $exchanges: exchanges }),
			freeUsd: calculateTokenUsdAmount({ amount: free, token, $exchanges: exchanges })
		});

		return acc;
	}, []);
};

// Total fiat value of all DEX-deposited balances (free + reserved), to add to
// the hero net-worth total.
export const sumOisyTradeAssetsUsd = (assets: OisyTradeAsset[]): number =>
	assets.reduce((acc, { totalUsd }) => acc + (totalUsd ?? 0), 0);

// The OISY tokens the user can deposit: DEX-supported tokens (matched by ledger
// canister id) that the user holds in their wallet. The first token per ledger id
// wins (the combined list is ordered ICP → ICRC default → custom).
export const oisyTradeDepositableTokens = ({
	supportedTokens,
	tokens,
	hasBalance
}: {
	supportedTokens: OisyTradeToken[];
	tokens: IcToken[];
	hasBalance: (token: IcToken) => boolean;
}): IcToken[] => {
	// Resolve by ledger canister id (like Send and the order form), NOT by symbol,
	// so a token's exact network/identity is preserved (e.g. a staging/testnet
	// ledger isn't collapsed onto its mainnet namesake). Deduped by ledger id.
	const byLedgerId = new Map(tokens.map((token) => [token.ledgerCanisterId, token]));
	const seen = new Set<string>();

	return supportedTokens.reduce<IcToken[]>((acc, { id: { ledger_id } }) => {
		const token = byLedgerId.get(ledger_id.toText());

		if (nonNullish(token) && !seen.has(token.ledgerCanisterId) && hasBalance(token)) {
			seen.add(token.ledgerCanisterId);
			acc.push(token);
		}

		return acc;
	}, []);
};

// True when at least one balance is reserved by an open order, i.e. the
// "Available" line should be shown (available < total).
export const oisyTradeAssetHasReserved = ({ reserved }: OisyTradeAsset): boolean => reserved > ZERO;
