import type {
	OrderBookDepth,
	PriceLevel,
	Side,
	TradingPairInfo
} from '$declarations/oisy_trade/oisy_trade.did';
import { ZERO } from '$lib/constants/app.constants';
import { calculateOisyTradeOffer, type OisyTradeOfferRejection } from '$lib/oisy-trade';
import fixture from '$tests/fixtures/oisy-trade/offer-calculation.json';
import { Principal } from '@dfinity/principal';
import { toNullable } from '@dfinity/utils';

interface FixtureLevel {
	price: string;
	quantity: string;
}

interface FixtureCase {
	id: string;
	description: string;
	side: string;
	sourceAmount: string;
	book?: { bids: FixtureLevel[]; asks: FixtureLevel[] };
	pair?: { minNotional?: string; maxNotional?: string };
	expect: {
		price?: string;
		quantity?: string;
		deposit?: string;
		gross?: string;
		maxSourceRelease?: string;
		reason?: string;
	};
	expectReceive?: string;
}

const BASIS_POINTS = 10_000n;

const { pair: fixturePair, fees, book, cases } = fixture;

const baseUnit = 10n ** BigInt(fixturePair.baseDecimals);

const toLevels = (levels: FixtureLevel[]): PriceLevel[] =>
	levels.map(({ price, quantity }) => ({ price: BigInt(price), quantity: BigInt(quantity) }));

const toDepth = (source: { bids: FixtureLevel[]; asks: FixtureLevel[] }): OrderBookDepth => ({
	bids: toLevels(source.bids),
	asks: toLevels(source.asks)
});

const leg = ({ symbol, decimals }: { symbol: string; decimals: number }) => ({
	id: { ledger_id: Principal.anonymous() },
	metadata: { symbol, decimals }
});

const toPair = (overrides?: { minNotional?: string; maxNotional?: string }): TradingPairInfo => ({
	status: { Trading: null },
	base: leg({ symbol: fixturePair.baseSymbol, decimals: fixturePair.baseDecimals }),
	quote: leg({ symbol: fixturePair.quoteSymbol, decimals: fixturePair.quoteDecimals }),
	lot_size: BigInt(fixturePair.lotSize),
	tick_size: BigInt(fixturePair.tickSize),
	min_notional: BigInt(overrides?.minNotional ?? fixturePair.minNotional),
	max_notional: toNullable(
		(overrides?.maxNotional ?? fixturePair.maxNotional) === null
			? undefined
			: BigInt((overrides?.maxNotional ?? fixturePair.maxNotional) as string)
	),
	maker_fee_bps: fixturePair.makerFeeBps,
	taker_fee_bps: fixturePair.takerFeeBps
});

const toSide = (side: string): Side => (side === 'sell' ? { Sell: null } : { Buy: null });

const request = (testCase: FixtureCase) => ({
	pair: toPair(testCase.pair),
	side: toSide(testCase.side),
	sourceAmount: BigInt(testCase.sourceAmount),
	depth: toDepth(testCase.book ?? book)
});

/**
 * What the order actually clears at maker prices, walking the same snapshot: the
 * quote proceeds of a Sell, and the quote cost of a Buy. The venue matches at the
 * resting order's price, not at the incoming limit, so this is what the offer is
 * measured against.
 */
const replayFill = ({
	levels,
	quantity
}: {
	levels: PriceLevel[];
	quantity: bigint;
}): { filled: bigint; value: bigint } => {
	let remaining = quantity;
	let value = ZERO;

	for (const level of levels) {
		if (remaining <= ZERO) {
			break;
		}

		const taken = level.quantity < remaining ? level.quantity : remaining;

		value += level.price * taken;
		remaining -= taken;
	}

	return { filled: quantity - remaining, value: value / baseUnit };
};

const offerCases = (cases as FixtureCase[]).filter(({ expect: { reason } }) => !reason);

describe('calculateOisyTradeOffer', () => {
	describe('the worked examples', () => {
		it.each(cases as FixtureCase[])('$id — $description', (testCase) => {
			const result = calculateOisyTradeOffer(request(testCase));

			if (testCase.expect.reason) {
				expect(result).toEqual({ ok: false, reason: testCase.expect.reason });

				return;
			}

			expect(result).toEqual({
				ok: true,
				offer: {
					price: BigInt(testCase.expect.price as string),
					quantity: BigInt(testCase.expect.quantity as string),
					deposit: BigInt(testCase.expect.deposit as string),
					gross: BigInt(testCase.expect.gross as string),
					maxSourceRelease: BigInt(testCase.expect.maxSourceRelease as string)
				}
			});
		});
	});

	describe('the offer is a floor the venue cannot undercut', () => {
		it.each(offerCases)('$id fills in full and clears at least the offer', (testCase) => {
			const result = calculateOisyTradeOffer(request(testCase));

			assert(result.ok);

			const { price, quantity, deposit, gross, maxSourceRelease } = result.offer;
			const depth = toDepth(testCase.book ?? book);

			if (testCase.side === 'sell') {
				// Only levels at or above the limit may match a Sell.
				const crossing = depth.bids.filter((level) => level.price >= price);
				const { filled, value } = replayFill({ levels: crossing, quantity });

				expect(filled).toBe(quantity);
				expect(value).toBeGreaterThanOrEqual(gross);
				// A Sell reserves the quantity and a full fill transfers all of it, so the
				// venue has nothing of the source leg left to hand back.
				expect(maxSourceRelease).toBe(ZERO);

				return;
			}

			// A Buy receives exactly the quantity it ordered, and can only match levels
			// at or below its limit — so the offer holds iff the book supplies it there.
			const crossing = depth.asks.filter((level) => level.price <= price);
			const { filled, value } = replayFill({ levels: crossing, quantity });

			expect(filled).toBe(quantity);
			expect(gross).toBe(quantity);
			// The reserve is taken at the limit price, so the real cost cannot exceed it.
			expect(value).toBeLessThanOrEqual(deposit);
			// And the reserve the venue releases is precisely the part the fill did not
			// spend — the bound settlement withdraws the source residue within.
			expect(maxSourceRelease).toBe(deposit - value);
		});
	});

	describe('the deposit never exceeds what the caller typed', () => {
		it.each(offerCases)('$id', (testCase) => {
			const result = calculateOisyTradeOffer(request(testCase));

			assert(result.ok);

			expect(result.offer.deposit).toBeLessThanOrEqual(BigInt(testCase.sourceAmount));
			expect(result.offer.quantity % BigInt(fixturePair.lotSize)).toBe(ZERO);
		});
	});

	describe('malformed input is not a rejection', () => {
		const sell = { ...request(offerCases[0]), side: toSide('sell') };

		it('throws on a non-positive lot size', () => {
			expect(() =>
				calculateOisyTradeOffer({
					...sell,
					pair: { ...sell.pair, lot_size: ZERO }
				})
			).toThrow(/non-positive lot size/);
		});

		it('throws on a non-positive price level', () => {
			expect(() =>
				calculateOisyTradeOffer({
					...sell,
					depth: { bids: [{ price: ZERO, quantity: 10_000_000_000n }], asks: [] }
				})
			).toThrow(/non-positive price/);
		});
	});

	describe('rejections', () => {
		it('rejects a non-positive source amount', () => {
			const result = calculateOisyTradeOffer({ ...request(offerCases[0]), sourceAmount: ZERO });

			expect(result).toEqual({
				ok: false,
				reason: 'below_lot' satisfies OisyTradeOfferRejection
			});
		});

		it('does not floor a Buy level down before accumulating its value', () => {
			// Two asks each worth half a quote unit: individually they floor to nothing,
			// together they cover a spend of one. Reducing each level to quote units
			// before summing would report `no_liquidity` on a book that can fill.
			const base = request(offerCases[3]);
			const result = calculateOisyTradeOffer({
				...base,
				pair: { ...base.pair, lot_size: 1n },
				sourceAmount: 1n,
				depth: {
					bids: [],
					asks: [
						{ price: 5_000_000n, quantity: 10n },
						{ price: 5_000_000n, quantity: 10n }
					]
				}
			});

			assert(result.ok);

			expect(result.offer).toEqual({
				price: 5_000_000n,
				quantity: 20n,
				deposit: 1n,
				gross: 20n,
				maxSourceRelease: ZERO
			});
		});
	});
});

describe('the offer-calculation fixture', () => {
	it('declares receive amounts consistent with its own fees', () => {
		const takerFeeBps = BigInt(fixturePair.takerFeeBps);

		offerCases.forEach(({ id, side, expect: expected, expectReceive }) => {
			const gross = BigInt(expected.gross as string);
			// Rounded up, so the quoted amount is never a base unit optimistic.
			const takerFee = (gross * takerFeeBps + BASIS_POINTS - 1n) / BASIS_POINTS;
			const ledgerFee = BigInt(side === 'sell' ? fees.quoteLedgerFee : fees.baseLedgerFee);

			expect(gross - takerFee - ledgerFee, `case ${id}`).toBe(BigInt(expectReceive as string));
		});
	});
});
