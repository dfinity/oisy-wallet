import { IC_CYCLES_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import type { Erc20ContractAddressWithNetwork } from '$icp-eth/types/icrc-erc20';
import { Currency } from '$lib/enums/currency';
import type {
	CoingeckoSimplePrice,
	CoingeckoSimplePriceResponse,
	CoingeckoSimpleTokenPrice,
	CoingeckoSimpleTokenPriceResponse
} from '$lib/types/coingecko';
import type { ExchangesData } from '$lib/types/exchange';
import type { PostMessageDataResponseExchange } from '$lib/types/post-message';
import type { TokenId } from '$lib/types/token';
import {
	buildErc20PriceParams,
	exchangesDataEqual,
	findMissingErc20ContractAddresses,
	findMissingLedgerCanisterIds,
	findMissingSplTokenAddresses,
	formatIcpSwapToCoingeckoPrices,
	formatKongSwapToCoingeckoPrices,
	isTcyclesLedgerCanisterId,
	mergeExchangePrices,
	type ProviderFallbackPrices,
	xdrBasketStatus,
	xdrUsdPrice
} from '$lib/utils/exchange.utils';
import { MOCK_CANISTER_ID_1, MOCK_CANISTER_ID_2 } from '$tests/mocks/exchanges.mock';
import { createMockIcpSwapToken } from '$tests/mocks/icpswap.mock';
import { createMockKongSwapToken } from '$tests/mocks/kongswap.mock';

describe('exchange.utils', () => {
	describe('formatIcpSwapToCoingeckoPrices', () => {
		it('converts valid token to coingecko price format', () => {
			const mock = createMockIcpSwapToken({
				tokenLedgerId: MOCK_CANISTER_ID_1,
				price: '1.230000000000000000',
				priceChange24H: '2.500000000000000000',
				volumeUSD24H: '50000.000000000000000000'
			});

			const result = formatIcpSwapToCoingeckoPrices([mock]);

			expect(result[MOCK_CANISTER_ID_1.toLowerCase()]).toEqual({
				usd: 1.23,
				usd_market_cap: 0,
				usd_24h_vol: 50_000,
				usd_24h_change: 2.5
			});
		});

		it('skips token where price is "0"', () => {
			const mock = createMockIcpSwapToken({
				price: '0.000000000000000000'
			});
			const result = formatIcpSwapToCoingeckoPrices([mock]);

			expect(result).toEqual({});
		});

		it('skips token where price is not a number', () => {
			const mock = createMockIcpSwapToken({
				price: 'NaN' as unknown as string
			});
			const result = formatIcpSwapToCoingeckoPrices([mock]);

			expect(result).toEqual({});
		});

		it('skips token where tvlUSD is below threshold', () => {
			const mock = createMockIcpSwapToken({
				price: '1.230000000000000000',
				tvlUSD: '1.780000000000000000'
			});
			const result = formatIcpSwapToCoingeckoPrices([mock]);

			expect(result).toEqual({});
		});

		it('skips token where tvlUSD is zero', () => {
			const mock = createMockIcpSwapToken({
				price: '1.230000000000000000',
				tvlUSD: '0.000000000000000000'
			});
			const result = formatIcpSwapToCoingeckoPrices([mock]);

			expect(result).toEqual({});
		});

		it('skips token where tvlUSD is exactly at the threshold', () => {
			const mock = createMockIcpSwapToken({
				price: '1.230000000000000000',
				tvlUSD: '500.000000000000000000'
			});
			const result = formatIcpSwapToCoingeckoPrices([mock]);

			expect(result).toEqual({});
		});

		it('accepts token where tvlUSD is just above threshold', () => {
			const mock = createMockIcpSwapToken({
				tokenLedgerId: MOCK_CANISTER_ID_1,
				price: '1.230000000000000000',
				tvlUSD: '500.010000000000000000'
			});
			const result = formatIcpSwapToCoingeckoPrices([mock]);

			expect(result[MOCK_CANISTER_ID_1.toLowerCase()]).toEqual({
				usd: 1.23,
				usd_market_cap: 0,
				usd_24h_vol: 50_000,
				usd_24h_change: 2.5
			});
		});

		it('skips token where tvlUSD is negative', () => {
			const mock = createMockIcpSwapToken({
				price: '1.230000000000000000',
				tvlUSD: '-500.000000000000000000'
			});
			const result = formatIcpSwapToCoingeckoPrices([mock]);

			expect(result).toEqual({});
		});

		it('skips token where tvlUSD is NaN', () => {
			const mock = createMockIcpSwapToken({
				price: '1.230000000000000000',
				tvlUSD: 'NaN' as unknown as string
			});
			const result = formatIcpSwapToCoingeckoPrices([mock]);

			expect(result).toEqual({});
		});

		it('filters stale tokens but keeps healthy ones in a batch', () => {
			const stale = createMockIcpSwapToken({
				tokenLedgerId: MOCK_CANISTER_ID_1,
				price: '99000.000000000000000000',
				tvlUSD: '1.780000000000000000'
			});
			const healthy = createMockIcpSwapToken({
				tokenLedgerId: MOCK_CANISTER_ID_2,
				price: '2.500000000000000000',
				tvlUSD: '500000.000000000000000000'
			});

			const result = formatIcpSwapToCoingeckoPrices([stale, healthy]);

			expect(result[MOCK_CANISTER_ID_1.toLowerCase()]).toBeUndefined();
			expect(result[MOCK_CANISTER_ID_2.toLowerCase()]).toBeDefined();
			expect(result[MOCK_CANISTER_ID_2.toLowerCase()].usd).toBe(2.5);
		});

		it('lowercases canister IDs in output keys', () => {
			const mock = createMockIcpSwapToken({
				tokenLedgerId: MOCK_CANISTER_ID_1,
				price: '5.000000000000000000'
			});

			const result = formatIcpSwapToCoingeckoPrices([mock]);

			expect(Object.keys(result)).toEqual([MOCK_CANISTER_ID_1.toLowerCase()]);
		});
	});

	describe('formatKongSwapToCoingeckoPrices', () => {
		it('converts valid token to coingecko price format', () => {
			const mock = createMockKongSwapToken({
				token: { canister_id: MOCK_CANISTER_ID_1 },
				metrics: {
					price: 1.23,
					market_cap: 1000000,
					volume_24h: 50000,
					price_change_24h: 2.5,
					updated_at: '2024-01-01T00:00:00.000Z'
				}
			});

			const result = formatKongSwapToCoingeckoPrices([mock]);

			expect(result[MOCK_CANISTER_ID_1.toLowerCase()]).toEqual({
				usd: 1.23,
				usd_market_cap: 1_000_000,
				usd_24h_vol: 50_000,
				usd_24h_change: 2.5,
				last_updated_at: new Date('2024-01-01T00:00:00.000Z').getTime()
			});
		});

		it('skips tokenData where metrics.price is null', () => {
			const mock = createMockKongSwapToken({
				metrics: { price: null as unknown as number }
			});
			const result = formatKongSwapToCoingeckoPrices([mock]);

			expect(result).toEqual({});
		});

		it('skips tokenData where metrics.price is 0', () => {
			const mock = createMockKongSwapToken({
				metrics: { price: 0 }
			});
			const result = formatKongSwapToCoingeckoPrices([mock]);

			expect(result).toEqual({});
		});

		it('parses even if some optional metrics fields are missing', () => {
			const mock = createMockKongSwapToken({
				token: { canister_id: MOCK_CANISTER_ID_1 },
				metrics: {
					price: 1.0,
					market_cap: undefined as unknown as number,
					volume_24h: undefined as unknown as number,
					price_change_24h: undefined as unknown as number,
					updated_at: '2024-01-01T00:00:00.000Z'
				}
			});
			const result = formatKongSwapToCoingeckoPrices([mock]);

			expect(result[MOCK_CANISTER_ID_1.toLowerCase()].usd).toBe(1);
			expect(result[MOCK_CANISTER_ID_1.toLowerCase()].usd_market_cap).toBeNaN();
		});
	});

	describe('findMissingCanisterIds', () => {
		it('returns empty array when all IDs are found in response', () => {
			const response: CoingeckoSimpleTokenPriceResponse = {
				[MOCK_CANISTER_ID_1.toLowerCase()]: {
					usd: 1,
					usd_market_cap: 1000,
					usd_24h_vol: 500,
					usd_24h_change: 2,
					last_updated_at: 1700000000
				}
			};

			const result = findMissingLedgerCanisterIds({
				allLedgerCanisterIds: [MOCK_CANISTER_ID_1],
				coingeckoResponse: response
			});

			expect(result).toEqual([]);
		});

		it('returns missing IDs not in coingecko response', () => {
			const response: CoingeckoSimpleTokenPriceResponse = {
				[MOCK_CANISTER_ID_1.toLowerCase()]: {
					usd: 1,
					usd_market_cap: 1000,
					usd_24h_vol: 500,
					usd_24h_change: 2,
					last_updated_at: 1700000000
				}
			};

			const result = findMissingLedgerCanisterIds({
				allLedgerCanisterIds: [MOCK_CANISTER_ID_1, MOCK_CANISTER_ID_2],
				coingeckoResponse: response
			});

			expect(result).toEqual([MOCK_CANISTER_ID_2]);
		});

		it('returns all IDs if response is empty', () => {
			const result = findMissingLedgerCanisterIds({
				allLedgerCanisterIds: [MOCK_CANISTER_ID_1, MOCK_CANISTER_ID_2],
				coingeckoResponse: {}
			});

			expect(result).toEqual([MOCK_CANISTER_ID_1, MOCK_CANISTER_ID_2]);
		});

		it('returns empty array if allLedgerCanisterIds is empty', () => {
			const result = findMissingLedgerCanisterIds({
				allLedgerCanisterIds: [],
				coingeckoResponse: {}
			});

			expect(result).toEqual([]);
		});

		it('handles case-insensitive matching of canister IDs', () => {
			const response: CoingeckoSimpleTokenPriceResponse = {
				[MOCK_CANISTER_ID_1.toLowerCase()]: {
					usd: 1,
					usd_market_cap: 1000,
					usd_24h_vol: 500,
					usd_24h_change: 2,
					last_updated_at: 1700000000
				}
			};

			const result = findMissingLedgerCanisterIds({
				allLedgerCanisterIds: ['AAAAA-AA'],
				coingeckoResponse: response
			});

			expect(result).toEqual([]);
		});

		it('ignores unrelated extra keys in response', () => {
			const response: CoingeckoSimpleTokenPriceResponse = {
				'not-a-canister-id': {
					usd: 0,
					usd_market_cap: 0,
					usd_24h_vol: 0,
					usd_24h_change: 0,
					last_updated_at: 0
				}
			};

			const result = findMissingLedgerCanisterIds({
				allLedgerCanisterIds: [MOCK_CANISTER_ID_1],
				coingeckoResponse: response
			});

			expect(result).toEqual([MOCK_CANISTER_ID_1]);
		});
	});

	describe('exchangesDataEqual', () => {
		const tokenA = Symbol('tokenA') as TokenId;
		const tokenB = Symbol('tokenB') as TokenId;
		const tokenC = Symbol('tokenC') as TokenId;

		const price = (usd: number) => ({ usd });

		it('returns true for two empty records', () => {
			const a = {} as ExchangesData;
			const b = {} as ExchangesData;

			expect(exchangesDataEqual(a, b)).toBeTruthy();
		});

		it('returns true when both records have the same keys with the same usd values', () => {
			const a = { [tokenA]: price(1.5), [tokenB]: price(2.0) } as ExchangesData;
			const b = { [tokenA]: price(1.5), [tokenB]: price(2.0) } as ExchangesData;

			expect(exchangesDataEqual(a, b)).toBeTruthy();
		});

		it('returns true when both entries share the same object reference', () => {
			const shared = price(10);
			const a = { [tokenA]: shared } as ExchangesData;
			const b = { [tokenA]: shared } as ExchangesData;

			expect(exchangesDataEqual(a, b)).toBeTruthy();
		});

		it('returns true when both entries are undefined', () => {
			const a = { [tokenA]: undefined } as ExchangesData;
			const b = { [tokenA]: undefined } as ExchangesData;

			expect(exchangesDataEqual(a, b)).toBeTruthy();
		});

		it('returns false when key counts differ', () => {
			const a = { [tokenA]: price(1) } as ExchangesData;
			const b = { [tokenA]: price(1), [tokenB]: price(2) } as ExchangesData;

			expect(exchangesDataEqual(a, b)).toBeFalsy();
		});

		it('returns false when usd values differ for the same key', () => {
			const a = { [tokenA]: price(1) } as ExchangesData;
			const b = { [tokenA]: price(999) } as ExchangesData;

			expect(exchangesDataEqual(a, b)).toBeFalsy();
		});

		it('returns false when a key exists in a but not in b', () => {
			const a = { [tokenA]: price(1) } as ExchangesData;
			const b = { [tokenB]: price(1) } as ExchangesData;

			expect(exchangesDataEqual(a, b)).toBeFalsy();
		});

		it('returns false when one entry is undefined and the other is not', () => {
			const a = { [tokenA]: undefined } as ExchangesData;
			const b = { [tokenA]: price(5) } as ExchangesData;

			expect(exchangesDataEqual(a, b)).toBeFalsy();
		});

		it('ignores non-usd fields when comparing', () => {
			const a = {
				[tokenA]: { usd: 1, usd_market_cap: 100, usd_24h_vol: 50 }
			} as ExchangesData;
			const b = {
				[tokenA]: { usd: 1, usd_market_cap: 999, usd_24h_vol: 999 }
			} as ExchangesData;

			expect(exchangesDataEqual(a, b)).toBeTruthy();
		});

		it('handles multiple keys where only one differs', () => {
			const a = {
				[tokenA]: price(1),
				[tokenB]: price(2),
				[tokenC]: price(3)
			} as ExchangesData;
			const b = {
				[tokenA]: price(1),
				[tokenB]: price(2),
				[tokenC]: price(999)
			} as ExchangesData;

			expect(exchangesDataEqual(a, b)).toBeFalsy();
		});
	});

	describe('findMissingErc20ContractAddresses', () => {
		const erc20 = (address: string): Erc20ContractAddressWithNetwork => ({
			address,
			coingeckoId: 'ethereum',
			chainId: 1n
		});

		it('returns addresses absent from the response (case-insensitive on keys)', () => {
			const response: CoingeckoSimpleTokenPriceResponse = {
				'0xaaa': { usd: 1, usd_market_cap: 0 }
			};

			const result = findMissingErc20ContractAddresses({
				allErc20ContractAddresses: [erc20('0xAAA'), erc20('0xBBB')],
				coingeckoResponse: response
			});

			expect(result).toEqual([erc20('0xBBB')]);
		});

		it('treats mixed-case response keys as priced', () => {
			const response: CoingeckoSimpleTokenPriceResponse = {
				'0xAbCd': { usd: 1, usd_market_cap: 0 }
			};

			const result = findMissingErc20ContractAddresses({
				allErc20ContractAddresses: [erc20('0xabcd'), erc20('0xBBB')],
				coingeckoResponse: response
			});

			expect(result).toEqual([erc20('0xBBB')]);
		});

		it('returns all addresses when response is empty', () => {
			const result = findMissingErc20ContractAddresses({
				allErc20ContractAddresses: [erc20('0xAAA'), erc20('0xBBB')],
				coingeckoResponse: {}
			});

			expect(result).toEqual([erc20('0xAAA'), erc20('0xBBB')]);
		});

		it('returns empty array when nothing requested', () => {
			const result = findMissingErc20ContractAddresses({
				allErc20ContractAddresses: [],
				coingeckoResponse: {}
			});

			expect(result).toEqual([]);
		});
	});

	describe('findMissingSplTokenAddresses', () => {
		it('returns addresses absent from the response', () => {
			const response: CoingeckoSimpleTokenPriceResponse = {
				spl1: { usd: 1, usd_market_cap: 0 }
			};

			const result = findMissingSplTokenAddresses({
				allSplTokenAddresses: ['spl1', 'spl2'],
				coingeckoResponse: response
			});

			expect(result).toEqual(['spl2']);
		});

		it('returns all addresses when response is empty', () => {
			const result = findMissingSplTokenAddresses({
				allSplTokenAddresses: ['spl1', 'spl2'],
				coingeckoResponse: {}
			});

			expect(result).toEqual(['spl1', 'spl2']);
		});
	});

	describe('buildErc20PriceParams', () => {
		it('groups addresses by coingecko platform id', () => {
			const result = buildErc20PriceParams([
				{ address: '0x123', coingeckoId: 'ethereum', chainId: 1n },
				{ address: '0xabc', coingeckoId: 'ethereum', chainId: 1n },
				{ address: '0x456', coingeckoId: 'base', chainId: 8453n }
			]);

			expect(result).toEqual([
				{
					coingeckoPlatformId: 'ethereum',
					contractAddresses: [
						{ address: '0x123', coingeckoId: 'ethereum' },
						{ address: '0xabc', coingeckoId: 'ethereum' }
					]
				},
				{
					coingeckoPlatformId: 'base',
					contractAddresses: [{ address: '0x456', coingeckoId: 'base' }]
				}
			]);
		});

		// The gate in `buildErc20PriceParams` re-hardcodes the platform list that
		// `CoingeckoPlatformIdSchema` already encodes, and a platform missing from it is dropped
		// with no error — so a new EVM chain looks wired up and silently has no ERC-20 prices.
		// Robinhood Chain is pinned here because adding the schema entry alone is not enough.
		it('keeps addresses on Robinhood Chain', () => {
			const result = buildErc20PriceParams([
				{ address: '0x789', coingeckoId: 'robinhood', chainId: 4663n }
			]);

			expect(result).toEqual([
				{
					coingeckoPlatformId: 'robinhood',
					contractAddresses: [{ address: '0x789', coingeckoId: 'robinhood' }]
				}
			]);
		});

		it('drops addresses with an unsupported coingecko platform id', () => {
			const result = buildErc20PriceParams([
				{ address: '0x123', coingeckoId: 'ethereum', chainId: 1n },
				{
					address: '0xunknown',
					coingeckoId: 'unsupported' as Erc20ContractAddressWithNetwork['coingeckoId'],
					chainId: 1n
				}
			]);

			expect(result).toEqual([
				{
					coingeckoPlatformId: 'ethereum',
					contractAddresses: [{ address: '0x123', coingeckoId: 'ethereum' }]
				}
			]);
		});

		it('returns an empty array when given no addresses', () => {
			expect(buildErc20PriceParams([])).toEqual([]);
		});
	});

	describe('mergeExchangePrices', () => {
		const tokenPrice = (usd: number): CoingeckoSimpleTokenPrice => ({ usd, usd_market_cap: 0 });
		const nativePrice = ({
			key,
			usd
		}: {
			key: string;
			usd: number;
		}): CoingeckoSimplePriceResponse => ({
			[key]: { usd }
		});

		const baseBackendData = (): PostMessageDataResponseExchange => ({
			currentExchangeRate: {
				exchangeRateToUsd: 1,
				exchangeRate24hChangeMultiplier: 1,
				currency: Currency.USD
			},
			currentEthPrice: undefined,
			currentBtcPrice: undefined,
			currentErc20Prices: {},
			currentIcpPrice: undefined,
			currentIcrcPrices: {},
			currentSolPrice: undefined,
			currentSplPrices: {},
			currentErc4626Prices: {},
			currentBnbPrice: undefined,
			currentPolPrice: undefined,
			currentArbitrumEthPrice: undefined,
			currentBaseEthPrice: undefined
		});

		const identityErc4626 = (prices: CoingeckoSimpleTokenPriceResponse) => Promise.resolve(prices);

		it('fills only the keys the backend left empty and lets the backend win on collisions', async () => {
			const backendData: PostMessageDataResponseExchange = {
				...baseBackendData(),
				currentErc20Prices: { '0xbackend': tokenPrice(100) }
			};

			const providerPrices: ProviderFallbackPrices = {
				erc20Prices: { '0xbackend': tokenPrice(999), '0xprovider': tokenPrice(5) }
			};

			const merged = await mergeExchangePrices({
				backendData,
				providerPrices,
				erc4626Prices: identityErc4626
			});

			expect(merged.currentErc20Prices).toEqual({
				'0xbackend': tokenPrice(100),
				'0xprovider': tokenPrice(5)
			});
		});

		it('fills each token-map category from the providers', async () => {
			const providerPrices: ProviderFallbackPrices = {
				erc20Prices: { '0xprovider': tokenPrice(1) },
				icrcPrices: { icrc1: tokenPrice(2) },
				splPrices: { spl1: tokenPrice(3) }
			};

			const merged = await mergeExchangePrices({
				backendData: baseBackendData(),
				providerPrices,
				erc4626Prices: identityErc4626
			});

			expect(merged.currentErc20Prices).toEqual({ '0xprovider': tokenPrice(1) });
			expect(merged.currentIcrcPrices).toEqual({ icrc1: tokenPrice(2) });
			expect(merged.currentSplPrices).toEqual({ spl1: tokenPrice(3) });
		});

		it('fills missing native prices but keeps backend native prices on collisions', async () => {
			const backendData: PostMessageDataResponseExchange = {
				...baseBackendData(),
				currentBtcPrice: nativePrice({ key: 'bitcoin', usd: 42000 })
			};

			const providerPrices: ProviderFallbackPrices = {
				ethPrice: nativePrice({ key: 'ethereum', usd: 2000 }),
				btcPrice: nativePrice({ key: 'bitcoin', usd: 1 }),
				arbitrumEthPrice: nativePrice({ key: 'ethereum', usd: 2000 }),
				baseEthPrice: nativePrice({ key: 'ethereum', usd: 2000 })
			};

			const merged = await mergeExchangePrices({
				backendData,
				providerPrices,
				erc4626Prices: identityErc4626
			});

			expect(merged.currentEthPrice).toEqual(nativePrice({ key: 'ethereum', usd: 2000 }));
			expect(merged.currentArbitrumEthPrice).toEqual(nativePrice({ key: 'ethereum', usd: 2000 }));
			expect(merged.currentBaseEthPrice).toEqual(nativePrice({ key: 'ethereum', usd: 2000 }));
			// backend wins
			expect(merged.currentBtcPrice).toEqual(nativePrice({ key: 'bitcoin', usd: 42000 }));
		});

		it('recomputes erc4626 prices from the merged erc20 prices', async () => {
			const backendData: PostMessageDataResponseExchange = {
				...baseBackendData(),
				currentErc20Prices: { '0xbackend': tokenPrice(100) }
			};

			const providerPrices: ProviderFallbackPrices = {
				erc20Prices: { '0xprovider': tokenPrice(5) }
			};

			const erc4626Spy = vi.fn(
				(prices: CoingeckoSimpleTokenPriceResponse): Promise<CoingeckoSimpleTokenPriceResponse> =>
					Promise.resolve({ '0xvault': tokenPrice(7), ...prices })
			);

			const merged = await mergeExchangePrices({
				backendData,
				providerPrices,
				erc4626Prices: erc4626Spy
			});

			expect(erc4626Spy).toHaveBeenCalledExactlyOnceWith({
				'0xbackend': tokenPrice(100),
				'0xprovider': tokenPrice(5)
			});
			expect(merged.currentErc4626Prices).toEqual({
				'0xvault': tokenPrice(7),
				'0xbackend': tokenPrice(100),
				'0xprovider': tokenPrice(5)
			});
		});

		it('keeps the backend erc4626 prices when the fallback filled no erc20 prices', async () => {
			const backendErc4626 = { '0xvault': tokenPrice(7) };
			const backendData: PostMessageDataResponseExchange = {
				...baseBackendData(),
				currentErc20Prices: { '0xbackend': tokenPrice(100) },
				currentErc4626Prices: backendErc4626
			};

			const erc4626Spy = vi.fn(
				(prices: CoingeckoSimpleTokenPriceResponse): Promise<CoingeckoSimpleTokenPriceResponse> =>
					Promise.resolve(prices)
			);

			// Fallback filled other categories only — erc20Prices absent and empty respectively.
			for (const providerPrices of [
				{ icrcPrices: { icrc1: tokenPrice(2) } },
				{ erc20Prices: {}, icrcPrices: { icrc1: tokenPrice(2) } }
			] satisfies ProviderFallbackPrices[]) {
				const merged = await mergeExchangePrices({
					backendData,
					providerPrices,
					erc4626Prices: erc4626Spy
				});

				expect(merged.currentErc4626Prices).toEqual(backendErc4626);
				expect(merged.currentErc20Prices).toEqual({ '0xbackend': tokenPrice(100) });
			}

			expect(erc4626Spy).not.toHaveBeenCalled();
		});
	});

	describe('xdrUsdPrice', () => {
		// BTC on 2026-09-25 at 11:00 UTC, from CoinGecko's hourly history.
		const btcPrice: CoingeckoSimplePrice = {
			usd: 84705.76,
			eur: 74319.22,
			cny: 568494.22,
			jpy: 13369872.07,
			gbp: 63957.51
		};

		// The IMF's published USD value of one XDR for 2026-09-25.
		const imfXdrUsd = 1.36008;

		const basket = ({
			usd,
			eur,
			cny,
			jpy,
			gbp
		}: Required<Pick<CoingeckoSimplePrice, 'usd' | 'eur' | 'cny' | 'jpy' | 'gbp'>>): number =>
			0.57813 +
			0.37379 * (usd / eur) +
			1.0993 * (usd / cny) +
			13.452 * (usd / jpy) +
			0.08087 * (usd / gbp);

		it('values the IMF basket at BTC’s price in each of its currencies', () => {
			const result = xdrUsdPrice(btcPrice);

			expect(result?.usd).toBeCloseTo(1.36029, 5);
			expect(Math.abs((result?.usd ?? 0) / imfXdrUsd - 1)).toBeLessThan(0.0002);
		});

		it('sets no market cap and no 24h change without the changes', () => {
			expect(xdrUsdPrice(btcPrice)).toEqual({ usd: expect.any(Number), usd_market_cap: 0 });
		});

		it('has no 24h change when every currency moved like USD against BTC', () => {
			const result = xdrUsdPrice({
				...btcPrice,
				usd_24h_change: -2.13,
				eur_24h_change: -2.13,
				cny_24h_change: -2.13,
				jpy_24h_change: -2.13,
				gbp_24h_change: -2.13
			});

			expect(result?.usd_24h_change).toBeCloseTo(0, 10);
		});

		it('values the basket at the rates of 24 hours earlier for its 24h change', () => {
			const changes = {
				usd_24h_change: 1.5,
				eur_24h_change: 0.9,
				cny_24h_change: 1.4,
				jpy_24h_change: 2.2,
				gbp_24h_change: 1.1
			};

			const result = xdrUsdPrice({ ...btcPrice, ...changes });

			const before = basket({
				usd: btcPrice.usd / (1 + changes.usd_24h_change / 100),
				eur: (btcPrice.eur ?? 0) / (1 + changes.eur_24h_change / 100),
				cny: (btcPrice.cny ?? 0) / (1 + changes.cny_24h_change / 100),
				jpy: (btcPrice.jpy ?? 0) / (1 + changes.jpy_24h_change / 100),
				gbp: (btcPrice.gbp ?? 0) / (1 + changes.gbp_24h_change / 100)
			});

			expect(result?.usd_24h_change).toBeCloseTo(((result?.usd ?? 0) / before - 1) * 100, 10);
		});

		it('leaves out the 24h change when one of the changes is missing', () => {
			const result = xdrUsdPrice({
				...btcPrice,
				usd_24h_change: -2.13,
				eur_24h_change: -2.13,
				cny_24h_change: -2.13,
				jpy_24h_change: -2.13
			});

			expect(result).toEqual({ usd: expect.any(Number), usd_market_cap: 0 });
		});

		it('returns undefined without a BTC price', () => {
			expect(xdrUsdPrice(undefined)).toBeUndefined();
		});

		it.each([
			{ currency: 'usd', value: undefined },
			{ currency: 'usd', value: 0 },
			{ currency: 'usd', value: -1 },
			{ currency: 'usd', value: NaN },
			{ currency: 'usd', value: Infinity },
			{ currency: 'eur', value: undefined },
			{ currency: 'cny', value: 0 },
			{ currency: 'jpy', value: NaN },
			{ currency: 'gbp', value: Infinity }
		])('returns undefined when BTC’s $currency price is $value', ({ currency, value }) => {
			expect(
				xdrUsdPrice({ ...btcPrice, [currency]: value } as CoingeckoSimplePrice)
			).toBeUndefined();
		});
	});

	describe('isTcyclesLedgerCanisterId', () => {
		it('recognises the TCYCLES ledger', () => {
			expect(isTcyclesLedgerCanisterId(IC_CYCLES_LEDGER_CANISTER_ID)).toBeTruthy();
		});

		it('does not take another ledger for it', () => {
			expect(isTcyclesLedgerCanisterId(MOCK_CANISTER_ID_1)).toBeFalsy();
		});
	});

	describe('xdrBasketStatus', () => {
		it.each([
			{ date: '2026-09-28T10:00:00.000Z', expected: undefined },
			{ date: '2027-07-24T23:59:59.999Z', expected: undefined },
			{ date: '2027-07-25T00:00:00.000Z', expected: { phase: 'expiring_soon', daysLeft: 7 } },
			{ date: '2027-07-31T23:00:00.000Z', expected: { phase: 'expiring_soon', daysLeft: 1 } },
			{ date: '2027-08-01T00:00:00.000Z', expected: { phase: 'grace', daysLeft: 61 } },
			{ date: '2027-09-30T23:00:00.000Z', expected: { phase: 'grace', daysLeft: 1 } },
			{ date: '2027-10-01T00:00:00.000Z', expected: { phase: 'expired', daysLeft: 0 } },
			{ date: '2030-01-01T00:00:00.000Z', expected: { phase: 'expired', daysLeft: 0 } }
		])('at $date is $expected', ({ date, expected }) => {
			expect(xdrBasketStatus(new Date(date).getTime())).toEqual(expected);
		});
	});
});
