import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { EarningCardFields } from '$env/types/env.earning-cards';
import { ZERO } from '$lib/constants/app.constants';
import { AppPath } from '$lib/constants/routes.constants';
import {
	liquidiumAssetNetworkIcons,
	liquidiumBorrowData,
	liquidiumBorrowingPowerUsd,
	liquidiumBorrowInterestUsd,
	liquidiumBorrowMarkets,
	liquidiumEarningData,
	liquidiumHealthFactorPercent,
	liquidiumMarkets,
	liquidiumMaxLtv,
	liquidiumMaxSupplyApy,
	liquidiumMinBorrowApy,
	liquidiumNetValueUsd,
	liquidiumPortfolio,
	liquidiumRepayReserves,
	liquidiumSupplyMarkets,
	liquidiumTotalBorrowedUsd,
	liquidiumWithdrawReserves
} from '$lib/derived/liquidium.derived';
import { enabledMainnetFungibleTokensUsdBalance } from '$lib/derived/tokens-ui.derived';
import { liquidiumStore } from '$lib/stores/liquidium.store';
import type { LiquidiumMarket, LiquidiumPortfolio, LiquidiumReserve } from '$lib/types/liquidium';
import { formatStakeApyNumber } from '$lib/utils/format.utils';
import { liquidiumNetInterestUsd } from '$lib/utils/liquidium.utils';
import { get } from 'svelte/store';

const mockGoto = vi.fn();
vi.mock('$app/navigation', () => ({ goto: (...args: unknown[]) => mockGoto(...args) }));

describe('liquidiumEarningData', () => {
	const portfolio: LiquidiumPortfolio = {
		reserves: [
			{
				poolId: 'pool-btc',
				asset: 'BTC',
				chain: 'BTC',
				supplyApy: 5,
				borrowApy: 0,
				deposited: ZERO,
				depositedDecimals: 8,
				borrowed: ZERO,
				borrowedDecimals: 8,
				suppliedUsd: 1000,
				borrowedUsd: 0
			}
		],
		totalSuppliedUsd: 1000,
		totalBorrowedUsd: 0,
		netValueUsd: 1000,
		availableBorrowsUsd: 0,
		weightedLiquidationThresholdBps: 8000,
		healthFactorPercent: 100
	};

	beforeEach(() => {
		mockGoto.mockClear();
		liquidiumStore.reset();
	});

	it('maps markets and portfolio into earning-card fields', () => {
		liquidiumStore.set({
			markets: [
				{
					poolId: 'pool-btc',
					asset: 'BTC',
					chain: 'BTC',
					supplyApy: 5,
					borrowApy: 9,
					frozen: false,
					available: true
				}
			],
			portfolio,
			assetPrices: {}
		});

		const data = get(liquidiumEarningData);
		const balance = get(enabledMainnetFungibleTokensUsdBalance);

		expect(data[EarningCardFields.APY]).toBe(formatStakeApyNumber(5));
		expect(data[EarningCardFields.NETWORKS]).toEqual(expect.arrayContaining([expect.any(String)]));
		expect(data[EarningCardFields.ASSETS]).toEqual(expect.arrayContaining([expect.any(String)]));
		expect(data[EarningCardFields.CURRENT_EARNING]).toBeCloseTo(liquidiumNetInterestUsd(portfolio));
		// Earning potential floors the idle balance at 0, so supplied > balance never goes negative.
		expect(data[EarningCardFields.EARNING_POTENTIAL]).toBeCloseTo(
			(Math.max(0, balance - portfolio.totalSuppliedUsd) * 5) / 100
		);
	});

	it('navigates to the provider page on action', async () => {
		await get(liquidiumEarningData).action();

		expect(mockGoto).toHaveBeenCalledWith(AppPath.ProvidersLiquidium);
	});
});

describe('liquidiumBorrowData', () => {
	const portfolio: LiquidiumPortfolio = {
		reserves: [
			{
				poolId: 'pool-eth',
				asset: 'USDC',
				chain: 'ETH',
				supplyApy: 0,
				borrowApy: 8,
				deposited: ZERO,
				depositedDecimals: 6,
				borrowed: 1_000n,
				borrowedDecimals: 6,
				suppliedUsd: 0,
				borrowedUsd: 2000
			}
		],
		totalSuppliedUsd: 5000,
		totalBorrowedUsd: 2000,
		netValueUsd: 3000,
		availableBorrowsUsd: 1500,
		weightedLiquidationThresholdBps: 8000,
		healthFactorPercent: 60
	};

	beforeEach(() => {
		mockGoto.mockClear();
		liquidiumStore.reset();
	});

	it('maps markets and portfolio into borrow-card fields', () => {
		liquidiumStore.set({
			markets: [
				{
					poolId: 'pool-btc',
					asset: 'BTC',
					chain: 'BTC',
					supplyApy: 5,
					borrowApy: 9,
					frozen: false,
					available: true
				},
				{
					poolId: 'pool-eth',
					asset: 'USDC',
					chain: 'ETH',
					supplyApy: 3,
					borrowApy: 4,
					frozen: false,
					available: true
				}
			],
			portfolio,
			assetPrices: {}
		});

		const data = get(liquidiumBorrowData);

		expect(data[EarningCardFields.APY]).toBe(formatStakeApyNumber(4));
		expect(data[EarningCardFields.NETWORKS]).toEqual(expect.arrayContaining([expect.any(String)]));
		expect(data[EarningCardFields.ASSETS]).toEqual(expect.arrayContaining([expect.any(String)]));
		expect(data[EarningCardFields.CURRENT_BORROWING]).toBe(2000);
		expect(data[EarningCardFields.INTEREST_PER_YEAR]).toBeCloseTo((2000 * 8) / 100);
	});

	it('reports zero cost fields when there are no positions', () => {
		const data = get(liquidiumBorrowData);

		expect(data[EarningCardFields.CURRENT_BORROWING]).toBe(0);
		expect(data[EarningCardFields.INTEREST_PER_YEAR]).toBe(0);
	});

	it('navigates to the provider page on action', async () => {
		await get(liquidiumBorrowData).action();

		expect(mockGoto).toHaveBeenCalledWith(AppPath.ProvidersLiquidium);
	});
});

describe('liquidium derived stores', () => {
	const market = (overrides: Partial<LiquidiumMarket> = {}): LiquidiumMarket => ({
		poolId: 'pool-btc',
		asset: 'BTC',
		chain: 'BTC',
		supplyApy: 5,
		borrowApy: 9,
		frozen: false,
		available: true,
		...overrides
	});

	const portfolio: LiquidiumPortfolio = {
		reserves: [],
		totalSuppliedUsd: 1200,
		totalBorrowedUsd: 200,
		netValueUsd: 1000,
		availableBorrowsUsd: 0,
		weightedLiquidationThresholdBps: 8000,
		healthFactorPercent: 73
	};

	beforeEach(() => {
		liquidiumStore.reset();
	});

	describe('liquidiumMarkets', () => {
		it('reflects the markets in the store', () => {
			const markets = [market()];
			liquidiumStore.set({ markets, portfolio: null, assetPrices: {} });

			expect(get(liquidiumMarkets)).toEqual(markets);
		});

		it('is empty by default', () => {
			expect(get(liquidiumMarkets)).toEqual([]);
		});

		it('sorts markets by pool (native rail first), placing ICP after the ETH pool', () => {
			// Store keeps the raw order; the derived applies the display sort. USDC seeded before
			// ETH to prove the derived re-orders rather than passing the store through.
			liquidiumStore.set({
				markets: [
					market(),
					market({ asset: 'BTC', chain: 'ICP' }),
					market({ poolId: 'pool-usdc', asset: 'USDC', chain: 'ETH' }),
					market({ poolId: 'pool-usdc', asset: 'USDC', chain: 'ICP' }),
					market({ poolId: 'pool-eth', asset: 'ETH', chain: 'ETH' }),
					market({ poolId: 'pool-icp', asset: 'ICP', chain: 'ICP' })
				],
				portfolio: null,
				assetPrices: {}
			});

			expect(get(liquidiumMarkets).map(({ asset, chain }) => `${asset}-${chain}`)).toEqual([
				'BTC-BTC',
				'BTC-ICP',
				'ETH-ETH',
				'ICP-ICP',
				'USDC-ETH',
				'USDC-ICP'
			]);
		});
	});

	describe('liquidiumAssetNetworkIcons', () => {
		it('is empty by default', () => {
			expect(get(liquidiumAssetNetworkIcons)).toEqual({});
		});

		it('maps each asset to the network icons of its rails, deduped across markets', () => {
			liquidiumStore.set({
				markets: [
					market(),
					// Same asset on the same rail again: the icon must not be duplicated.
					market({ poolId: 'pool-btc-2', asset: 'BTC', chain: 'BTC' }),
					market({ poolId: 'pool-eth', asset: 'ETH', chain: 'ETH' }),
					market({ poolId: 'pool-usdc', asset: 'USDC', chain: 'ETH' }),
					market({ poolId: 'pool-icp', asset: 'ICP', chain: 'ICP' })
				],
				portfolio: null,
				assetPrices: {}
			});

			expect(get(liquidiumAssetNetworkIcons)).toEqual({
				BTC: [BTC_MAINNET_TOKEN.network.icon],
				ETH: [ETHEREUM_TOKEN.network.icon],
				USDC: [USDC_TOKEN.network.icon],
				ICP: [ICP_TOKEN.network.icon]
			});
		});
	});

	describe('liquidiumPortfolio', () => {
		it('reflects the portfolio in the store', () => {
			liquidiumStore.set({ markets: [], portfolio, assetPrices: {} });

			expect(get(liquidiumPortfolio)).toEqual(portfolio);
		});

		it('is null by default', () => {
			expect(get(liquidiumPortfolio)).toBeNull();
		});
	});

	describe('liquidiumSupplyMarkets', () => {
		it('keeps only available markets', () => {
			liquidiumStore.set({
				markets: [market(), market({ poolId: 'pool-eth', available: false })],
				portfolio: null,
				assetPrices: {}
			});

			expect(get(liquidiumSupplyMarkets)).toEqual([market()]);
		});

		it('excludes markets the user has borrowed', () => {
			liquidiumStore.set({
				markets: [market(), market({ poolId: 'pool-eth', asset: 'USDC', chain: 'ETH' })],
				portfolio: {
					...portfolio,
					reserves: [
						{
							poolId: 'pool-eth',
							asset: 'USDC',
							chain: 'ETH',
							supplyApy: 0,
							borrowApy: 8,
							deposited: ZERO,
							depositedDecimals: 6,
							borrowed: 1_000n,
							borrowedDecimals: 6,
							suppliedUsd: 0,
							borrowedUsd: 2000
						}
					]
				},
				assetPrices: {}
			});

			expect(get(liquidiumSupplyMarkets)).toEqual([market()]);
		});

		it('is empty by default', () => {
			expect(get(liquidiumSupplyMarkets)).toEqual([]);
		});
	});

	describe('liquidiumBorrowMarkets', () => {
		it('keeps only available markets', () => {
			liquidiumStore.set({
				markets: [market(), market({ poolId: 'pool-eth', available: false })],
				portfolio: null,
				assetPrices: {}
			});

			expect(get(liquidiumBorrowMarkets)).toEqual([market()]);
		});

		it('excludes markets the user has supplied', () => {
			liquidiumStore.set({
				markets: [market(), market({ poolId: 'pool-eth', asset: 'USDC', chain: 'ETH' })],
				portfolio: {
					...portfolio,
					reserves: [
						{
							poolId: 'pool-eth',
							asset: 'USDC',
							chain: 'ETH',
							supplyApy: 3,
							borrowApy: 0,
							deposited: 1_000n,
							depositedDecimals: 6,
							borrowed: ZERO,
							borrowedDecimals: 6,
							suppliedUsd: 2000,
							borrowedUsd: 0
						}
					]
				},
				assetPrices: {}
			});

			expect(get(liquidiumBorrowMarkets)).toEqual([market()]);
		});

		it('is empty by default', () => {
			expect(get(liquidiumBorrowMarkets)).toEqual([]);
		});
	});

	describe('liquidiumWithdrawReserves', () => {
		const reserve = (overrides: Partial<LiquidiumReserve> = {}): LiquidiumReserve => ({
			poolId: 'pool-btc',
			asset: 'BTC',
			chain: 'BTC',
			supplyApy: 5,
			borrowApy: 9,
			deposited: 1_000n,
			depositedDecimals: 8,
			borrowed: ZERO,
			borrowedDecimals: 8,
			suppliedUsd: 1000,
			borrowedUsd: 0,
			...overrides
		});

		it('keeps only reserves with a supplied balance', () => {
			liquidiumStore.set({
				markets: [],
				portfolio: {
					...portfolio,
					reserves: [reserve(), reserve({ poolId: 'pool-eth', asset: 'USDC', deposited: ZERO })]
				},
				assetPrices: {}
			});

			expect(get(liquidiumWithdrawReserves)).toEqual([reserve()]);
		});

		it('is empty by default', () => {
			expect(get(liquidiumWithdrawReserves)).toEqual([]);
		});
	});

	describe('liquidiumRepayReserves', () => {
		const reserve = (overrides: Partial<LiquidiumReserve> = {}): LiquidiumReserve => ({
			poolId: 'pool-usdc',
			asset: 'USDC',
			chain: 'ETH',
			supplyApy: 0,
			borrowApy: 8,
			deposited: ZERO,
			depositedDecimals: 6,
			borrowed: 1_000n,
			borrowedDecimals: 6,
			suppliedUsd: 0,
			borrowedUsd: 2000,
			...overrides
		});

		it('keeps only reserves with outstanding debt', () => {
			liquidiumStore.set({
				markets: [],
				portfolio: {
					...portfolio,
					reserves: [reserve(), reserve({ poolId: 'pool-btc', asset: 'BTC', borrowed: ZERO })]
				},
				assetPrices: {}
			});

			expect(get(liquidiumRepayReserves)).toEqual([reserve()]);
		});

		it('is empty by default', () => {
			expect(get(liquidiumRepayReserves)).toEqual([]);
		});
	});

	describe('liquidiumMaxSupplyApy', () => {
		it('returns the best APY across available pools', () => {
			liquidiumStore.set({
				markets: [market({ supplyApy: 5 }), market({ poolId: 'pool-eth', supplyApy: 7 })],
				portfolio: null,
				assetPrices: {}
			});

			expect(get(liquidiumMaxSupplyApy)).toBe(7);
		});

		it('ignores unavailable pools', () => {
			liquidiumStore.set({
				markets: [
					market({ supplyApy: 5 }),
					market({ poolId: 'pool-eth', supplyApy: 9, available: false })
				],
				portfolio: null,
				assetPrices: {}
			});

			expect(get(liquidiumMaxSupplyApy)).toBe(5);
		});

		it('is 0 when there are no markets', () => {
			expect(get(liquidiumMaxSupplyApy)).toBe(0);
		});
	});

	describe('liquidiumMinBorrowApy', () => {
		it('returns the lowest borrow APY across available pools', () => {
			liquidiumStore.set({
				markets: [market({ borrowApy: 9 }), market({ poolId: 'pool-eth', borrowApy: 4 })],
				portfolio: null,
				assetPrices: {}
			});

			expect(get(liquidiumMinBorrowApy)).toBe(4);
		});

		it('is 0 when there are no markets', () => {
			expect(get(liquidiumMinBorrowApy)).toBe(0);
		});
	});

	describe('liquidiumTotalBorrowedUsd', () => {
		it('reflects the portfolio debt', () => {
			liquidiumStore.set({ markets: [], portfolio, assetPrices: {} });

			expect(get(liquidiumTotalBorrowedUsd)).toBe(200);
		});

		it('is 0 when there is no portfolio', () => {
			expect(get(liquidiumTotalBorrowedUsd)).toBe(0);
		});
	});

	describe('liquidiumMaxLtv', () => {
		it('returns the highest maxLtv across available pools', () => {
			liquidiumStore.set({
				markets: [market({ maxLtv: 0.5 }), market({ poolId: 'pool-eth', maxLtv: 0.8 })],
				portfolio: null,
				assetPrices: {}
			});

			expect(get(liquidiumMaxLtv)).toBeCloseTo(0.8);
		});

		it('is 0 when there are no markets', () => {
			expect(get(liquidiumMaxLtv)).toBe(0);
		});
	});

	describe('liquidiumBorrowingPowerUsd', () => {
		// No wallet balances are seeded in the unit environment, so the idle-wallet term is 0
		// and the power reduces to the already-available borrows from supplied collateral.
		it('reflects the portfolio available borrows when there is no idle balance', () => {
			liquidiumStore.set({
				markets: [],
				portfolio: { ...portfolio, availableBorrowsUsd: 1500 },
				assetPrices: {}
			});

			expect(get(liquidiumBorrowingPowerUsd)).toBe(1500);
		});

		it('is 0 when there is no portfolio and no markets', () => {
			expect(get(liquidiumBorrowingPowerUsd)).toBe(0);
		});
	});

	describe('liquidiumBorrowInterestUsd', () => {
		it('is 0 when there is no portfolio', () => {
			expect(get(liquidiumBorrowInterestUsd)).toBe(0);
		});
	});

	describe('liquidiumNetValueUsd', () => {
		it('reflects the portfolio net value', () => {
			liquidiumStore.set({ markets: [], portfolio, assetPrices: {} });

			expect(get(liquidiumNetValueUsd)).toBe(1000);
		});

		it('is 0 when there is no portfolio', () => {
			expect(get(liquidiumNetValueUsd)).toBe(0);
		});
	});

	describe('liquidiumHealthFactorPercent', () => {
		it('reflects the portfolio health factor', () => {
			liquidiumStore.set({ markets: [], portfolio, assetPrices: {} });

			expect(get(liquidiumHealthFactorPercent)).toBe(73);
		});

		it('is null when there is no portfolio', () => {
			expect(get(liquidiumHealthFactorPercent)).toBeNull();
		});
	});
});
