import type { Erc20ContractAddressWithNetwork } from '$icp-eth/types/icrc-erc20';
import { Currency } from '$lib/enums/currency';
import type {
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
	mergeExchangePrices,
	type ProviderFallbackPrices
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
});
