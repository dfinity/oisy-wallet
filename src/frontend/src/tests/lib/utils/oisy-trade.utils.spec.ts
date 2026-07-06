import type {
	Token as OisyTradeToken,
	TradingPairInfo,
	UserOrder,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';
import type { IcToken } from '$icp/types/ic-token';
import { ZERO } from '$lib/constants/app.constants';
import type { ExchangesData } from '$lib/types/exchange';
import type {
	OisyTradeAsset,
	OisyTradeOrderStatus,
	OisyTradeOrderView
} from '$lib/types/oisy-trade';
import {
	type LimitOrderPairView,
	type OisyTradeSearchLabels,
	crossesBook,
	decimalsOfStep,
	deriveNotional,
	deriveQuoteAmount,
	feeBpsToPercent,
	floorToStep,
	formatTradeAmount,
	isMultipleOfStep,
	isOisyTradeOrderActive,
	isOrderValid,
	isPresetSelected,
	limitDecimals,
	mapOisyTradeAssets,
	mapOisyTradeOrder,
	mapOisyTradeOrders,
	maxSpendBaseAmount,
	oisyTradeAssetHasReserved,
	oisyTradeAssetMatchesFilter,
	oisyTradeDepositableTokens,
	oisyTradeOrderDisplayStatus,
	oisyTradeOrderMatchesFilter,
	oisyTradeSupportedTokenSymbols,
	orderStatusView,
	presetTargetPrice,
	queuePositionDisplay,
	queuePositionFraction,
	spendAmount,
	sumOisyTradeAssetsFreeUsd,
	sumOisyTradeAssetsUsd,
	toOisyTradeWithdrawTokens,
	toPairView,
	toPriceUnits,
	toQuantity,
	validateAmount,
	validatePrice,
	valueDifferencePercent
} from '$lib/utils/oisy-trade.utils';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { nonNullish } from '@dfinity/utils';
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

describe('oisy-trade.utils — balances & deposit', () => {
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
					{ totalUsd: 10 },
					{ totalUsd: undefined },
					{ totalUsd: 5 }
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
				] as any)
			).toBe(15);
		});
	});

	describe('sumOisyTradeAssetsFreeUsd', () => {
		it('sums the free fiat value, treating undefined as zero', () => {
			expect(
				sumOisyTradeAssetsFreeUsd([
					{ freeUsd: 8 },
					{ freeUsd: undefined },
					{ freeUsd: 2 }
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
				] as any)
			).toBe(10);
		});
	});

	describe('oisyTradeAssetHasReserved', () => {
		it('is true only when some balance is reserved', () => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			expect(oisyTradeAssetHasReserved({ reserved: 1n } as any)).toBeTruthy();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			expect(oisyTradeAssetHasReserved({ reserved: ZERO } as any)).toBeFalsy();
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

describe('oisy-trade.utils — limit order', () => {
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
	});

	describe('limitDecimals', () => {
		it('caps fractional digits and strips junk', () => {
			expect(limitDecimals({ raw: '1.23456', maxDecimals: 2 })).toBe('1.23');
			expect(limitDecimals({ raw: '1.5', maxDecimals: 0 })).toBe('1');
			expect(limitDecimals({ raw: '1a.2b', maxDecimals: 1 })).toBe('1.2');
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

	describe('formatTradeAmount', () => {
		it('rounds to the token decimals without leaking float artifacts', () => {
			// 0.1 * 3 = 0.30000000000000004 as a raw JS float.
			expect(formatTradeAmount({ amount: 0.1 * 3, decimals: 6 })).toBe('0.3');
			expect(formatTradeAmount({ amount: 25, decimals: 6 })).toBe('25');
			expect(formatTradeAmount({ amount: 1.23456789, decimals: 2 })).toBe('1.23');
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

describe('oisy-trade.utils — orders', () => {
	const baseLedgerId = mockValidIcToken.ledgerCanisterId;
	const quoteLedgerId = 'ryjl3-tyaaa-aaaaa-aaaba-cai';

	const baseToken: IcToken = {
		...mockValidIcToken,
		symbol: 'ICP',
		decimals: 8,
		ledgerCanisterId: baseLedgerId
	};
	const quoteToken: IcToken = {
		...mockValidIcToken,
		id: parseTokenId('QuoteTokenId'),
		symbol: 'ckUSDC',
		decimals: 6,
		ledgerCanisterId: quoteLedgerId
	};

	const tokens = [baseToken, quoteToken];

	const buildOrder = ({
		id = 'order-1',
		side,
		price,
		quantity,
		filledQuantity = ZERO,
		status,
		base = baseLedgerId,
		quote = quoteLedgerId
	}: {
		id?: string;
		side: 'Buy' | 'Sell';
		price: bigint;
		quantity: bigint;
		filledQuantity?: bigint;
		status: OisyTradeOrderStatus;
		base?: string;
		quote?: string;
	}): UserOrder =>
		({
			id,
			pair: { base: Principal.fromText(base), quote: Principal.fromText(quote) },
			order: {
				side: { [side]: null },
				price,
				quantity,
				filled_quantity: filledQuantity,
				status: { [status]: null }
			}
		}) as unknown as UserOrder;

	describe('mapOisyTradeOrder', () => {
		it('maps a sell order, scaling amounts to human units by ledger', () => {
			// 100 ICP at 2.75 ckUSDC/ICP. quantity in base (8 dp); price in quote (6 dp).
			const view = mapOisyTradeOrder({
				order: buildOrder({
					side: 'Sell',
					quantity: 100n * 100_000_000n,
					price: 2_750_000n,
					filledQuantity: 25n * 100_000_000n,
					status: 'Open'
				}),
				tokens
			});

			expect(view).toEqual({
				id: 'order-1',
				side: 'sell',
				base: baseToken,
				quote: quoteToken,
				quantity: 100,
				price: 2.75,
				filledQuantity: 25,
				status: 'Open'
			});
		});

		it('maps a buy order', () => {
			const view = mapOisyTradeOrder({
				order: buildOrder({
					side: 'Buy',
					quantity: 50n * 100_000_000n,
					price: 2_600_000n,
					status: 'Pending'
				}),
				tokens
			});

			expect(view?.side).toBe('buy');
			expect(view?.quantity).toBe(50);
			expect(view?.price).toBe(2.6);
			expect(view?.status).toBe('Pending');
		});

		it('drops an order whose base ledger cannot be resolved', () => {
			const view = mapOisyTradeOrder({
				order: buildOrder({
					side: 'Sell',
					quantity: 100n,
					price: 1n,
					status: 'Open',
					base: 'aaaaa-aa'
				}),
				tokens
			});

			expect(view).toBeUndefined();
		});

		it('drops an order whose quote ledger cannot be resolved', () => {
			const view = mapOisyTradeOrder({
				order: buildOrder({
					side: 'Buy',
					quantity: 100n,
					price: 1n,
					status: 'Open',
					quote: 'aaaaa-aa'
				}),
				tokens
			});

			expect(view).toBeUndefined();
		});
	});

	describe('mapOisyTradeOrders', () => {
		it('maps resolvable orders and drops unresolvable ones, preserving order', () => {
			const orders = [
				buildOrder({ id: 'a', side: 'Sell', quantity: 100n, price: 1n, status: 'Open' }),
				buildOrder({
					id: 'b',
					side: 'Buy',
					quantity: 100n,
					price: 1n,
					status: 'Filled',
					base: 'aaaaa-aa'
				}),
				buildOrder({ id: 'c', side: 'Buy', quantity: 100n, price: 1n, status: 'Pending' })
			];

			const views = mapOisyTradeOrders({ orders, tokens });

			expect(views.map(({ id }) => id)).toEqual(['a', 'c']);
		});
	});

	describe('oisyTradeOrderDisplayStatus', () => {
		it('shows an Open order with a fill as Partial, others unchanged', () => {
			expect(oisyTradeOrderDisplayStatus({ status: 'Open', filledQuantity: 0 } as never)).toBe(
				'Open'
			);
			expect(oisyTradeOrderDisplayStatus({ status: 'Open', filledQuantity: 1.5 } as never)).toBe(
				'Partial'
			);
			expect(oisyTradeOrderDisplayStatus({ status: 'Pending', filledQuantity: 0 } as never)).toBe(
				'Pending'
			);
			expect(oisyTradeOrderDisplayStatus({ status: 'Filled', filledQuantity: 10 } as never)).toBe(
				'Filled'
			);
		});
	});

	describe('orderStatusView', () => {
		it('maps every status to its label key and pill variant', () => {
			expect(orderStatusView('Open')).toEqual({ labelKey: 'Open', pillVariant: 'success' });
			expect(orderStatusView('Pending')).toEqual({ labelKey: 'Pending', pillVariant: 'warning' });
			// Partial (Open with a fill) reads amber like Pending.
			expect(orderStatusView('Partial')).toEqual({ labelKey: 'Partial', pillVariant: 'warning' });
			expect(orderStatusView('Filled')).toEqual({ labelKey: 'Filled', pillVariant: 'success' });
			// Canceled and Expired share the same muted default pill.
			expect(orderStatusView('Canceled')).toEqual({
				labelKey: 'Canceled',
				pillVariant: 'default'
			});
			expect(orderStatusView('Expired')).toEqual({
				labelKey: 'Expired',
				pillVariant: 'default'
			});
		});
	});

	describe('isOisyTradeOrderActive', () => {
		const activeFor = (status: OisyTradeOrderStatus): boolean => {
			const view = mapOisyTradeOrder({
				order: buildOrder({ side: 'Sell', quantity: 100n, price: 1n, status }),
				tokens
			});

			expect(view).toBeDefined();

			return nonNullish(view) && isOisyTradeOrderActive(view);
		};

		it('treats Pending and Open as active, everything else as not', () => {
			expect(activeFor('Pending')).toBeTruthy();
			expect(activeFor('Open')).toBeTruthy();
			expect(activeFor('Filled')).toBeFalsy();
			expect(activeFor('Canceled')).toBeFalsy();
			expect(activeFor('Expired')).toBeFalsy();
		});
	});
});

describe('oisy-trade.utils — search', () => {
	// base carries the ICP network (name "Internet Computer") from the shared mock.
	// Its token name is deliberately distinct from both the symbol and the network
	// name, so the symbol / token-name / network-name facets can be tested in
	// isolation ("icp" → symbol only, "sample" → name only, "internet" → network only).
	const base: IcToken = { ...mockValidIcToken, symbol: 'ICP', name: 'Sample Token' };
	const quote: IcToken = {
		...mockValidIcToken,
		id: parseTokenId('QuoteTokenId'),
		symbol: 'ckUSDC',
		name: 'ckUSDC'
	};

	const labels: OisyTradeSearchLabels = {
		sideSell: 'Sell',
		sideBuy: 'Buy',
		status: {
			Open: 'Open',
			Pending: 'Pending',
			Partial: 'Partial',
			Filled: 'Filled',
			Canceled: 'Canceled',
			Expired: 'Expired'
		},
		provider: 'OISY TRADE'
	};

	const order: OisyTradeOrderView = {
		id: 'order-1',
		side: 'sell',
		base,
		quote,
		quantity: 100,
		price: 2.5,
		filledQuantity: 0,
		status: 'Open'
	};

	describe('oisyTradeAssetMatchesFilter', () => {
		const asset: OisyTradeAsset = {
			token: base,
			free: ZERO,
			reserved: ZERO,
			total: ZERO,
			totalUsd: undefined,
			freeUsd: undefined
		};

		const matches = (filter: string): boolean =>
			oisyTradeAssetMatchesFilter({ asset, filter, providerLabel: labels.provider });

		it('matches everything on an empty or whitespace filter', () => {
			expect(matches('')).toBeTruthy();
			expect(matches('   ')).toBeTruthy();
		});

		it('matches on the token symbol, case-insensitively', () => {
			expect(matches('icp')).toBeTruthy();
			expect(matches('ICP')).toBeTruthy();
		});

		it('matches on the token name (term absent from symbol and network)', () => {
			expect(matches('sample')).toBeTruthy();
		});

		it('matches on the network name (term absent from symbol and token name)', () => {
			expect(matches('internet')).toBeTruthy();
		});

		it('matches on the provider label', () => {
			expect(matches('oisy')).toBeTruthy();
		});

		it('does not match an unrelated term', () => {
			expect(matches('dogecoin')).toBeFalsy();
		});
	});

	describe('oisyTradeOrderMatchesFilter', () => {
		const matches = ({
			order: candidate = order,
			filter
		}: {
			order?: OisyTradeOrderView;
			filter: string;
		}): boolean => oisyTradeOrderMatchesFilter({ order: candidate, filter, labels });

		it('matches everything on an empty filter', () => {
			expect(matches({ filter: '' })).toBeTruthy();
		});

		it('matches on either the base or the quote token', () => {
			expect(matches({ filter: 'icp' })).toBeTruthy(); // base symbol
			expect(matches({ filter: 'sample' })).toBeTruthy(); // base name (name-only term)
			expect(matches({ filter: 'ckusdc' })).toBeTruthy(); // quote symbol
		});

		it('matches on the network name (term absent from symbols and token names)', () => {
			expect(matches({ filter: 'internet' })).toBeTruthy();
		});

		it('matches a sell order on the side label but not the opposite side', () => {
			expect(matches({ filter: 'sell' })).toBeTruthy();
			expect(matches({ filter: 'buy' })).toBeFalsy();
		});

		it('matches a buy order on the buy side label', () => {
			expect(matches({ order: { ...order, side: 'buy' }, filter: 'buy' })).toBeTruthy();
		});

		it('matches on the status label', () => {
			expect(matches({ filter: 'open' })).toBeTruthy();
			expect(matches({ filter: 'filled' })).toBeFalsy();
		});

		it('matches the derived Partial status of a partially filled open order', () => {
			expect(matches({ order: { ...order, filledQuantity: 10 }, filter: 'partial' })).toBeTruthy();
		});

		it('matches on the provider label', () => {
			expect(matches({ filter: 'oisy trade' })).toBeTruthy();
		});

		it('adapts side and status matching to localized labels', () => {
			const frLabels: OisyTradeSearchLabels = {
				...labels,
				sideSell: 'Vendre',
				status: { ...labels.status, Open: 'Ouvert' }
			};

			expect(
				oisyTradeOrderMatchesFilter({ order, filter: 'vendre', labels: frLabels })
			).toBeTruthy();
			expect(
				oisyTradeOrderMatchesFilter({ order, filter: 'ouvert', labels: frLabels })
			).toBeTruthy();
		});

		it('does not match an unrelated term', () => {
			expect(matches({ filter: 'zzz' })).toBeFalsy();
		});
	});
});
