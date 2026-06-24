import type { TradingPairInfo } from '$declarations/oisy_trade/oisy_trade.did';
import {
	type LimitOrderPairView,
	crossesBook,
	decimalsOfStep,
	deriveNotional,
	deriveQuoteAmount,
	feeBpsToPercent,
	floorToStep,
	isMultipleOfStep,
	isOrderValid,
	isPresetSelected,
	limitDecimals,
	maxSpendBaseAmount,
	presetTargetPrice,
	queuePositionDisplay,
	queuePositionFraction,
	spendAmount,
	toPairView,
	toPriceUnits,
	toQuantity,
	validateAmount,
	validatePrice,
	valueDifferencePercent
} from '$lib/utils/oisy-trade.utils';

describe('oisy-trade.utils', () => {
	// ICP/ckUSDC-like pair: lot 0.25 ICP, tick 0.0005 ckUSDC, min 5 / max 30 ckUSDC.
	const pair: LimitOrderPairView = {
		baseSymbol: 'ICP',
		quoteSymbol: 'ckUSDC',
		baseDecimals: 8,
		quoteDecimals: 6,
		lotSize: 0.25,
		tickSize: 0.0005,
		minNotional: 5,
		maxNotional: 30,
		makerFeeBps: 0,
		takerFeeBps: 20
	};

	describe('decimalsOfStep', () => {
		it('handles power-of-ten and non-power-of-ten steps', () => {
			expect(decimalsOfStep(0.25)).toBe(2);
			expect(decimalsOfStep(0.1)).toBe(1);
			expect(decimalsOfStep(1)).toBe(0);
			expect(decimalsOfStep(0.0001)).toBe(4);
		});

		it('handles exponential notation', () => {
			expect(decimalsOfStep(1e-7)).toBe(7);
		});
	});

	describe('isMultipleOfStep', () => {
		it('accepts exact multiples and rejects others', () => {
			expect(isMultipleOfStep(15.25, 0.25)).toBeTruthy();
			expect(isMultipleOfStep(0.3, 0.25)).toBeFalsy();
			expect(isMultipleOfStep(0, 0.25)).toBeFalsy();
			expect(isMultipleOfStep(-0.5, 0.25)).toBeFalsy();
		});
	});

	describe('floorToStep', () => {
		it('floors to the largest valid multiple', () => {
			expect(floorToStep(15.4994, 0.25)).toBe(15.25);
			expect(floorToStep(0.1, 0.25)).toBe(0);
		});
	});

	describe('limitDecimals', () => {
		it('caps fractional digits and strips junk', () => {
			expect(limitDecimals('1.23456', 2)).toBe('1.23');
			expect(limitDecimals('1.5', 0)).toBe('1');
			expect(limitDecimals('1a.2b', 1)).toBe('1.2');
		});
	});

	describe('deriveQuoteAmount / deriveNotional', () => {
		it('computes base × price, NaN when incomplete', () => {
			expect(deriveQuoteAmount({ baseAmount: 10, price: 2.5 })).toBe(25);
			expect(deriveNotional({ baseAmount: 10, price: 2.5 })).toBe(25);
			expect(deriveQuoteAmount({ baseAmount: 0, price: 2.5 })).toBeNaN();
			expect(deriveQuoteAmount({ baseAmount: 10, price: 0 })).toBeNaN();
		});
	});

	describe('spendAmount', () => {
		it('is base on a sell, quote on a buy', () => {
			expect(spendAmount({ side: 'sell', baseAmount: 10, price: 2.5 })).toBe(10);
			expect(spendAmount({ side: 'buy', baseAmount: 10, price: 2.5 })).toBe(25);
		});
	});

	describe('crossesBook', () => {
		it('sell crosses at/below best bid', () => {
			expect(crossesBook({ side: 'sell', price: 2.685, bid: 2.685, ask: 2.7 })).toBeTruthy();
			expect(crossesBook({ side: 'sell', price: 2.69, bid: 2.685, ask: 2.7 })).toBeFalsy();
		});

		it('buy crosses at/above best ask', () => {
			expect(crossesBook({ side: 'buy', price: 2.7, bid: 2.685, ask: 2.7 })).toBeTruthy();
			expect(crossesBook({ side: 'buy', price: 2.69, bid: 2.685, ask: 2.7 })).toBeFalsy();
		});

		it('cannot cross an empty book side', () => {
			expect(crossesBook({ side: 'sell', price: 1, bid: null, ask: 2.7 })).toBeFalsy();
		});
	});

	describe('valueDifferencePercent', () => {
		it('is signed relative to current value per side', () => {
			expect(valueDifferencePercent({ side: 'sell', price: 2.69, currentValue: 2.69 })).toBeCloseTo(
				0
			);
			expect(
				valueDifferencePercent({ side: 'sell', price: 2.8245, currentValue: 2.69 })
			).toBeCloseTo(5, 1);
			expect(
				valueDifferencePercent({ side: 'buy', price: 2.5555, currentValue: 2.69 })
			).toBeCloseTo(5, 1);
		});
	});

	describe('validateAmount', () => {
		it('passes a valid amount', () => {
			expect(
				validateAmount({ side: 'sell', baseAmount: 10, price: 2.69, freeBalance: 100, pair }).ok
			).toBeTruthy();
		});

		it('surfaces balance before the lot check', () => {
			// 10.3 exceeds free 5 AND is not a 0.25 multiple → balance wins.
			expect(
				validateAmount({ side: 'sell', baseAmount: 10.3, price: 2.69, freeBalance: 5, pair })
					.errorKind
			).toBe('balance');
		});

		it('flags a non-lot multiple when affordable', () => {
			expect(
				validateAmount({ side: 'sell', baseAmount: 10.3, price: 2.69, freeBalance: 100, pair })
					.errorKind
			).toBe('lot');
		});

		it('flags min/max notional', () => {
			// 1 ICP × 2.69 = 2.69 < min 5.
			expect(
				validateAmount({ side: 'sell', baseAmount: 1, price: 2.69, freeBalance: 100, pair })
					.errorKind
			).toBe('min_notional');
			// 12 ICP × 2.69 = 32.28 > max 30.
			expect(
				validateAmount({ side: 'sell', baseAmount: 12, price: 2.69, freeBalance: 100, pair })
					.errorKind
			).toBe('max_notional');
		});
	});

	describe('validatePrice', () => {
		it('checks the tick multiple', () => {
			expect(validatePrice({ price: 2.69, pair })).toBeTruthy(); // 2.69 / 0.0005 = 5380
			expect(validatePrice({ price: 2.6901, pair })).toBeFalsy();
		});
	});

	describe('isOrderValid', () => {
		const base = {
			side: 'sell' as const,
			baseAmount: 10,
			price: 2.69,
			freeBalance: 100,
			pair,
			bid: 2.685,
			ask: 2.7
		};

		it('is true for a valid resting order', () => {
			expect(isOrderValid({ ...base, fillOrKill: false })).toBeTruthy();
		});

		it('is false when empty (zero) inputs', () => {
			expect(isOrderValid({ ...base, baseAmount: 0, fillOrKill: false })).toBeFalsy();
			expect(isOrderValid({ ...base, price: 0, fillOrKill: false })).toBeFalsy();
		});

		it('FOK requires the price to cross the book', () => {
			// resting sell at 2.69 does not cross (> bid) → invalid under FOK.
			expect(isOrderValid({ ...base, fillOrKill: true })).toBeFalsy();
			// at the bid it crosses → valid.
			expect(isOrderValid({ ...base, price: 2.685, fillOrKill: true })).toBeTruthy();
		});
	});

	describe('maxSpendBaseAmount', () => {
		it('sell: free base floored to lot', () => {
			expect(
				maxSpendBaseAmount({ side: 'sell', freeBase: 15.4994, freeQuote: 0, price: 2.69, pair })
			).toBe(15.25);
		});

		it('buy: free quote / price floored to lot, null without a price', () => {
			expect(
				maxSpendBaseAmount({ side: 'buy', freeBase: 0, freeQuote: 30, price: 2.69, pair })
			).toBe(11); // 30 / 2.69 = 11.15 → floor to 0.25 → 11.0
			expect(
				maxSpendBaseAmount({ side: 'buy', freeBase: 0, freeQuote: 30, price: 0, pair })
			).toBeNull();
		});
	});

	describe('presetTargetPrice', () => {
		it('book preset returns the crossing reference, snapped to tick', () => {
			expect(
				presetTargetPrice({
					preset: 'book',
					side: 'sell',
					currentValue: 2.69,
					bid: 2.685,
					ask: 2.7,
					tickSize: 0.0005
				})
			).toBeCloseTo(2.685, 4);
		});

		it('0% returns current value; offsets sign by side', () => {
			expect(
				presetTargetPrice({
					preset: 0,
					side: 'sell',
					currentValue: 2.69,
					bid: 2.685,
					ask: 2.7,
					tickSize: 0.0005
				})
			).toBeCloseTo(2.69, 4);
			// Sell +5% above current value.
			expect(
				presetTargetPrice({
					preset: 5,
					side: 'sell',
					currentValue: 2.69,
					bid: 2.685,
					ask: 2.7,
					tickSize: 0.0005
				})
			).toBeGreaterThan(2.69);
			// Buy −5% below current value.
			expect(
				presetTargetPrice({
					preset: 5,
					side: 'buy',
					currentValue: 2.69,
					bid: 2.685,
					ask: 2.7,
					tickSize: 0.0005
				})
			).toBeLessThan(2.69);
		});
	});

	describe('isPresetSelected', () => {
		it('is selected only while the price still equals the target', () => {
			expect(
				isPresetSelected({
					preset: 0,
					price: 2.69,
					side: 'sell',
					currentValue: 2.69,
					bid: 2.685,
					ask: 2.7,
					tickSize: 0.0005
				})
			).toBeTruthy();
			expect(
				isPresetSelected({
					preset: 0,
					price: 2.7,
					side: 'sell',
					currentValue: 2.69,
					bid: 2.685,
					ask: 2.7,
					tickSize: 0.0005
				})
			).toBeFalsy();
		});
	});

	describe('queuePositionFraction', () => {
		const asks = [
			{ price: 2.7, quantity: 40 },
			{ price: 2.71, quantity: 60 }
		];
		const bids = [
			{ price: 2.685, quantity: 30 },
			{ price: 2.68, quantity: 70 }
		];

		it('sell: share of asks priced strictly below the price', () => {
			// price 2.71 → only the 2.70 level (40) is strictly better → 40/100.
			expect(
				queuePositionFraction({ side: 'sell', price: 2.71, tickSize: 0.0005, asks, bids })
			).toBeCloseTo(0.4);
		});

		it('buy: share of bids priced strictly above the price', () => {
			// price 2.68 → the 2.685 level (30) is strictly better → 30/100.
			expect(
				queuePositionFraction({ side: 'buy', price: 2.68, tickSize: 0.0005, asks, bids })
			).toBeCloseTo(0.3);
		});

		it('null when there is no volume', () => {
			expect(
				queuePositionFraction({ side: 'sell', price: 2.7, tickSize: 0.0005, asks: [], bids })
			).toBeNull();
		});
	});

	describe('queuePositionDisplay', () => {
		it('zero is front of book', () => {
			expect(queuePositionDisplay(0)).toEqual({ front: true, percent: 0 });
		});

		it('< 10% uses one decimal and rounds up', () => {
			expect(queuePositionDisplay(0.0001)).toEqual({ front: false, percent: 0.1 });
			expect(queuePositionDisplay(0.034)).toEqual({ front: false, percent: 3.4 });
		});

		it('>= 10% is a whole number', () => {
			expect(queuePositionDisplay(0.156)).toEqual({ front: false, percent: 16 });
		});

		it('null passes through', () => {
			expect(queuePositionDisplay(null)).toBeNull();
		});
	});

	describe('feeBpsToPercent', () => {
		it('converts bps to a percentage', () => {
			expect(feeBpsToPercent(20)).toBe(0.2);
			expect(feeBpsToPercent(0)).toBe(0);
		});
	});

	describe('candid conversions', () => {
		const info = {
			base: { id: {}, metadata: { symbol: 'ICP', decimals: 8 } },
			quote: { id: {}, metadata: { symbol: 'ckUSDC', decimals: 6 } },
			lot_size: 25_000_000n, // 0.25 ICP at 8 decimals
			tick_size: 500n, // 0.0005 ckUSDC at 6 decimals
			min_notional: 5_000_000n, // 5 ckUSDC
			max_notional: [30_000_000n],
			maker_fee_bps: 0,
			taker_fee_bps: 20,
			status: { Trading: null }
		} as unknown as TradingPairInfo;

		it('toPairView scales steps and notional bounds to human units', () => {
			const view = toPairView(info);

			expect(view.lotSize).toBe(0.25);
			expect(view.tickSize).toBe(0.0005);
			expect(view.minNotional).toBe(5);
			expect(view.maxNotional).toBe(30);
			expect(view.takerFeeBps).toBe(20);
		});

		it('toQuantity / toPriceUnits scale to smallest units', () => {
			expect(toQuantity({ baseAmount: 0.25, baseDecimals: 8 })).toBe(25_000_000n);
			expect(toPriceUnits({ price: 2.69, quoteDecimals: 6 })).toBe(2_690_000n);
		});
	});
});
