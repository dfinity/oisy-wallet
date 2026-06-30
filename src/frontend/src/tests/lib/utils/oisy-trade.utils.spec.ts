import type {
	Token as OisyTradeToken,
	PriceLevel,
	TradingPairInfo,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';
import type { IcToken } from '$icp/types/ic-token';
import { ZERO } from '$lib/constants/app.constants';
import type { ExchangesData } from '$lib/types/exchange';
import type { OisyTradeAsset } from '$lib/types/oisy-trade';
import {
	type LimitOrderPairView,
	crossesBook,
	crossingReferencePrice,
	decimalsOfStep,
	deriveNotional,
	deriveQuoteAmount,
	feeBpsToPercent,
	floorToStep,
	isMultipleOfStep,
	isOrderValid,
	isPresetSelected,
	limitDecimals,
	mapOisyTradeAssets,
	maxSpendBaseAmount,
	oisyTradeAssetHasReserved,
	oisyTradeDepositableTokens,
	oisyTradeSupportedTokenSymbols,
	presetTargetPrice,
	priceLevelToHuman,
	queuePositionDisplay,
	queuePositionFraction,
	spendAmount,
	sumOisyTradeAssetsUsd,
	toCandidSide,
	toOisyTradeWithdrawTokens,
	toPairView,
	toPriceUnits,
	toQuantity,
	toTradingPair,
	validateAmount,
	validatePrice,
	valueDifferencePercent
} from '$lib/utils/oisy-trade.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { Principal } from '@icp-sdk/core/principal';

const mockLedgerId = mockValidIcToken.ledgerCanisterId;

const buildPair = ({ base, quote }: { base: string; quote: string }): TradingPairInfo =>
	({
		base: { metadata: { symbol: base } },
		quote: { metadata: { symbol: quote } }
	}) as unknown as TradingPairInfo;

const buildBalance = ({ free, reserved }: { free: bigint; reserved: bigint }): UserTokenBalance =>
	({
		token: { id: { ledger_id: Principal.fromText(mockLedgerId) } },
		balance: { free, reserved }
	}) as unknown as UserTokenBalance;

const buildAsset = (over: Partial<OisyTradeAsset>): OisyTradeAsset => ({
	token: mockValidIcToken,
	free: ZERO,
	reserved: ZERO,
	total: ZERO,
	totalUsd: undefined,
	freeUsd: undefined,
	...over
});

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
			expect(isMultipleOfStep({ value: 15.25, step: 0.25 })).toBeTruthy();
			expect(isMultipleOfStep({ value: 0.3, step: 0.25 })).toBeFalsy();
			expect(isMultipleOfStep({ value: 0, step: 0.25 })).toBeFalsy();
			expect(isMultipleOfStep({ value: -0.5, step: 0.25 })).toBeFalsy();
		});
	});

	describe('floorToStep', () => {
		it('floors to the largest valid multiple', () => {
			expect(floorToStep({ value: 15.4994, step: 0.25 })).toBe(15.25);
			expect(floorToStep({ value: 0.1, step: 0.25 })).toBe(0);
		});

		it('returns 0 for non-positive value or step', () => {
			expect(floorToStep({ value: 0, step: 0.25 })).toBe(0);
			expect(floorToStep({ value: -5, step: 0.25 })).toBe(0);
			expect(floorToStep({ value: 5, step: 0 })).toBe(0);
			expect(floorToStep({ value: 5, step: -1 })).toBe(0);
		});
	});

	describe('limitDecimals', () => {
		it('caps fractional digits and strips junk', () => {
			expect(limitDecimals({ raw: '1.23456', maxDecimals: 2 })).toBe('1.23');
			expect(limitDecimals({ raw: '1.5', maxDecimals: 0 })).toBe('1');
			expect(limitDecimals({ raw: '1a.2b', maxDecimals: 1 })).toBe('1.2');
		});

		it('returns the integer part unchanged when there is no dot', () => {
			expect(limitDecimals({ raw: '123', maxDecimals: 4 })).toBe('123');
			expect(limitDecimals({ raw: '1,000', maxDecimals: 4 })).toBe('1000');
		});

		it('collapses extra dots into a single fractional part', () => {
			expect(limitDecimals({ raw: '1.2.3.4', maxDecimals: 3 })).toBe('1.234');
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

	describe('crossingReferencePrice', () => {
		it('uses the bid on a sell and the ask on a buy', () => {
			expect(crossingReferencePrice({ side: 'sell', bid: 2.685, ask: 2.7 })).toBe(2.685);
			expect(crossingReferencePrice({ side: 'buy', bid: 2.685, ask: 2.7 })).toBe(2.7);
		});

		it('passes null through for an empty relevant side', () => {
			expect(crossingReferencePrice({ side: 'sell', bid: null, ask: 2.7 })).toBeNull();
			expect(crossingReferencePrice({ side: 'buy', bid: 2.685, ask: null })).toBeNull();
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
			expect(crossesBook({ side: 'buy', price: 99, bid: 2.685, ask: null })).toBeFalsy();
		});

		it('cannot cross with a non-positive price', () => {
			expect(crossesBook({ side: 'sell', price: 0, bid: 2.685, ask: 2.7 })).toBeFalsy();
			expect(crossesBook({ side: 'buy', price: -1, bid: 2.685, ask: 2.7 })).toBeFalsy();
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

		it('is zero when price or current value is non-positive', () => {
			expect(valueDifferencePercent({ side: 'sell', price: 0, currentValue: 2.69 })).toBe(0);
			expect(valueDifferencePercent({ side: 'buy', price: 2.69, currentValue: 0 })).toBe(0);
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

		it('rejects a non-positive amount without an error kind', () => {
			expect(
				validateAmount({ side: 'sell', baseAmount: 0, price: 2.69, freeBalance: 100, pair })
			).toEqual({
				ok: false
			});
		});

		it('skips the balance and notional checks when price is zero', () => {
			// price 0 → no spend/notional gate, only the lot check applies.
			expect(
				validateAmount({ side: 'sell', baseAmount: 10, price: 0, freeBalance: 0, pair }).ok
			).toBeTruthy();
			expect(
				validateAmount({ side: 'sell', baseAmount: 10.3, price: 0, freeBalance: 0, pair }).errorKind
			).toBe('lot');
		});

		it('uses the quote spend for a buy balance check', () => {
			// buy 10 ICP × 2.69 = 26.9 quote > free 5 → balance.
			expect(
				validateAmount({ side: 'buy', baseAmount: 10, price: 2.69, freeBalance: 5, pair }).errorKind
			).toBe('balance');
			// affordable quote spend passes.
			expect(
				validateAmount({ side: 'buy', baseAmount: 10, price: 2.69, freeBalance: 100, pair }).ok
			).toBeTruthy();
		});

		it('treats a null max_notional as unbounded above', () => {
			const unbounded: LimitOrderPairView = { ...pair, maxNotional: null };

			expect(
				validateAmount({
					side: 'sell',
					baseAmount: 100,
					price: 2.69,
					freeBalance: 1000,
					pair: unbounded
				}).ok
			).toBeTruthy();
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

		it('is false when the price is off the tick grid', () => {
			expect(isOrderValid({ ...base, price: 2.6901, fillOrKill: false })).toBeFalsy();
		});

		it('is false when the amount fails validation (off-lot)', () => {
			expect(isOrderValid({ ...base, baseAmount: 10.3, fillOrKill: false })).toBeFalsy();
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

		it('buy: null when the price is negative', () => {
			expect(
				maxSpendBaseAmount({ side: 'buy', freeBase: 0, freeQuote: 30, price: -1, pair })
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

		it('returns null when the tick size is non-positive', () => {
			expect(
				presetTargetPrice({
					preset: 0,
					side: 'sell',
					currentValue: 2.69,
					bid: 2.685,
					ask: 2.7,
					tickSize: 0
				})
			).toBeNull();
		});

		it('book preset returns null without a book on the relevant side', () => {
			expect(
				presetTargetPrice({
					preset: 'book',
					side: 'sell',
					currentValue: 2.69,
					bid: null,
					ask: 2.7,
					tickSize: 0.0005
				})
			).toBeNull();
		});

		it('0% preset returns null without a current value', () => {
			expect(
				presetTargetPrice({
					preset: 0,
					side: 'sell',
					currentValue: 0,
					bid: 2.685,
					ask: 2.7,
					tickSize: 0.0005
				})
			).toBeNull();
		});

		it('offset presets return null without a current value', () => {
			expect(
				presetTargetPrice({
					preset: 5,
					side: 'sell',
					currentValue: 0,
					bid: 2.685,
					ask: 2.7,
					tickSize: 0.0005
				})
			).toBeNull();
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

		it('is false when the price is non-positive', () => {
			expect(
				isPresetSelected({
					preset: 0,
					price: 0,
					side: 'sell',
					currentValue: 2.69,
					bid: 2.685,
					ask: 2.7,
					tickSize: 0.0005
				})
			).toBeFalsy();
		});

		it('is false when the preset target is unavailable', () => {
			// book preset with no bid → target null → not selected.
			expect(
				isPresetSelected({
					preset: 'book',
					price: 2.685,
					side: 'sell',
					currentValue: 2.69,
					bid: null,
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

		it('null when the price is non-positive', () => {
			expect(
				queuePositionFraction({ side: 'sell', price: 0, tickSize: 0.0005, asks, bids })
			).toBeNull();
		});

		it('front of book when nothing is priced strictly better', () => {
			// sell at the best ask (2.70) → no ask strictly below it → 0.
			expect(
				queuePositionFraction({ side: 'sell', price: 2.7, tickSize: 0.0005, asks, bids })
			).toBe(0);
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

		it('rounds the < 10% boundary up to a whole 10, not 10.0', () => {
			expect(queuePositionDisplay(0.0991)).toEqual({ front: false, percent: 10 });
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
		const baseLedgerId = Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai');
		const quoteLedgerId = Principal.fromText('xevnm-gaaaa-aaaar-qafnq-cai');

		const info = {
			base: { id: { ledger_id: baseLedgerId }, metadata: { symbol: 'ICP', decimals: 8 } },
			quote: { id: { ledger_id: quoteLedgerId }, metadata: { symbol: 'ckUSDC', decimals: 6 } },
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

			expect(view.baseSymbol).toBe('ICP');
			expect(view.quoteSymbol).toBe('ckUSDC');
			expect(view.baseDecimals).toBe(8);
			expect(view.quoteDecimals).toBe(6);
			expect(view.lotSize).toBe(0.25);
			expect(view.tickSize).toBe(0.0005);
			expect(view.minNotional).toBe(5);
			expect(view.maxNotional).toBe(30);
			expect(view.makerFeeBps).toBe(0);
			expect(view.takerFeeBps).toBe(20);
		});

		it('toPairView leaves maxNotional null when the candid optional is empty', () => {
			const view = toPairView({ ...info, max_notional: [] } as unknown as TradingPairInfo);

			expect(view.maxNotional).toBeNull();
		});

		it('toTradingPair maps the base/quote ledger principals', () => {
			const tradingPair = toTradingPair(info);

			expect(tradingPair.base.toText()).toBe(baseLedgerId.toText());
			expect(tradingPair.quote.toText()).toBe(quoteLedgerId.toText());
		});

		it('toQuantity / toPriceUnits scale to smallest units', () => {
			expect(toQuantity({ baseAmount: 0.25, baseDecimals: 8 })).toBe(25_000_000n);
			expect(toPriceUnits({ price: 2.69, quoteDecimals: 6 })).toBe(2_690_000n);
		});

		it('toCandidSide maps the form side to the candid variant', () => {
			expect(toCandidSide('sell')).toEqual({ Sell: null });
			expect(toCandidSide('buy')).toEqual({ Buy: null });
		});

		it('priceLevelToHuman scales a price level to human units', () => {
			const level = { price: 2_690_000n, quantity: 25_000_000n } as PriceLevel;

			expect(priceLevelToHuman({ level, baseDecimals: 8, quoteDecimals: 6 })).toEqual({
				price: 2.69,
				quantity: 0.25
			});
		});
	});

	describe('oisyTradeSupportedTokenSymbols', () => {
		it('returns the distinct union of base and quote symbols', () => {
			expect(
				oisyTradeSupportedTokenSymbols([
					buildPair({ base: 'ICP', quote: 'ckUSDC' }),
					buildPair({ base: 'ICP', quote: 'ckBTC' }),
					buildPair({ base: 'ckBTC', quote: 'ckUSDC' })
				])
			).toEqual(['ICP', 'ckUSDC', 'ckBTC']);
		});

		it('returns an empty list when there are no pairs', () => {
			expect(oisyTradeSupportedTokenSymbols([])).toEqual([]);
		});
	});

	describe('mapOisyTradeAssets', () => {
		const exchanges: ExchangesData = { [mockValidIcToken.id]: { usd: 2 } };

		it('resolves a balance to the matching token with totals and fiat values', () => {
			const assets = mapOisyTradeAssets({
				balances: [buildBalance({ free: 100n, reserved: 50n })],
				tokens: [mockValidIcToken],
				exchanges
			});

			expect(assets).toHaveLength(1);

			const [asset] = assets;

			expect(asset.token).toBe(mockValidIcToken);
			expect(asset.free).toBe(100n);
			expect(asset.reserved).toBe(50n);
			expect(asset.total).toBe(150n);
			expect(asset.totalUsd).toBeGreaterThan(0);
			expect(asset.freeUsd).toBeGreaterThan(0);
		});

		it('drops balances whose ledger is unknown', () => {
			const unknownToken: IcToken = {
				...mockValidIcToken,
				id: parseTokenId('UnknownToken'),
				ledgerCanisterId: 'aaaaa-aa'
			};

			expect(
				mapOisyTradeAssets({
					balances: [buildBalance({ free: 100n, reserved: ZERO })],
					tokens: [unknownToken],
					exchanges
				})
			).toEqual([]);
		});

		it('leaves fiat values undefined when no exchange rate is available', () => {
			const [asset] = mapOisyTradeAssets({
				balances: [buildBalance({ free: 100n, reserved: ZERO })],
				tokens: [mockValidIcToken],
				exchanges: {}
			});

			expect(asset.totalUsd).toBeUndefined();
			expect(asset.freeUsd).toBeUndefined();
		});
	});

	describe('sumOisyTradeAssetsUsd', () => {
		it('sums the total fiat value, treating undefined as zero', () => {
			expect(
				sumOisyTradeAssetsUsd([
					buildAsset({ totalUsd: 10 }),
					buildAsset({ totalUsd: undefined }),
					buildAsset({ totalUsd: 5 })
				])
			).toBe(15);
		});
	});

	describe('oisyTradeAssetHasReserved', () => {
		it('is true only when some balance is reserved', () => {
			expect(oisyTradeAssetHasReserved(buildAsset({ reserved: 1n }))).toBeTruthy();
			expect(oisyTradeAssetHasReserved(buildAsset({ reserved: ZERO }))).toBeFalsy();
		});
	});

	describe('oisyTradeDepositableTokens', () => {
		const LEDGER_ICP = 'ryjl3-tyaaa-aaaaa-aaaba-cai';
		const LEDGER_CKBTC = 'mxzaz-hqaaa-aaaar-qaada-cai';
		const LEDGER_OTHER = 'mc6ru-gyaaa-aaaar-qaaaq-cai';

		const supported = (ledgerId: string): OisyTradeToken => ({
			id: { ledger_id: Principal.fromText(ledgerId) },
			metadata: { symbol: 'X', decimals: 8 }
		});

		it('resolves supported tokens by ledger id (not symbol) and keeps only held ones', () => {
			const icp: IcToken = { ...mockValidIcToken, ledgerCanisterId: LEDGER_ICP, symbol: 'ICP' };
			const ckBtc: IcToken = {
				...mockValidIcToken,
				ledgerCanisterId: LEDGER_CKBTC,
				symbol: 'ckBTC'
			};
			// Same symbol as ICP but a different ledger (e.g. a testnet/staging
			// variant): must NOT be collapsed onto the supported mainnet ICP.
			const otherIcp: IcToken = {
				...mockValidIcToken,
				ledgerCanisterId: LEDGER_OTHER,
				symbol: 'ICP'
			};

			const result = oisyTradeDepositableTokens({
				supportedTokens: [supported(LEDGER_ICP), supported(LEDGER_CKBTC)],
				tokens: [icp, ckBtc, otherIcp],
				hasBalance: () => true
			});

			expect(result).toEqual([icp, ckBtc]);
		});

		it('drops tokens with no wallet balance', () => {
			const icp: IcToken = { ...mockValidIcToken, ledgerCanisterId: LEDGER_ICP, symbol: 'ICP' };

			expect(
				oisyTradeDepositableTokens({
					supportedTokens: [supported(LEDGER_ICP)],
					tokens: [icp],
					hasBalance: () => false
				})
			).toEqual([]);
		});
	});

	describe('toOisyTradeWithdrawTokens', () => {
		const dexBalance = ({
			ledgerCanisterId,
			free,
			reserved
		}: {
			ledgerCanisterId: string;
			free: bigint;
			reserved: bigint;
		}): UserTokenBalance =>
			({
				token: { id: { ledger_id: Principal.fromText(ledgerCanisterId) } },
				balance: { free, reserved }
			}) as unknown as UserTokenBalance;

		it('pairs a DEX balance with the matching OISY token by ledger canister id', () => {
			const result = toOisyTradeWithdrawTokens({
				balances: [
					dexBalance({
						ledgerCanisterId: mockValidIcToken.ledgerCanisterId,
						free: 10n,
						reserved: 3n
					})
				],
				icrcTokens: [mockValidIcToken]
			});

			expect(result).toEqual([{ token: mockValidIcToken, free: 10n, reserved: 3n }]);
		});

		it('drops balances whose ledger is unknown to the wallet', () => {
			const result = toOisyTradeWithdrawTokens({
				balances: [
					dexBalance({ ledgerCanisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai', free: 10n, reserved: ZERO })
				],
				icrcTokens: [mockValidIcToken]
			});

			expect(result).toEqual([]);
		});
	});
});
