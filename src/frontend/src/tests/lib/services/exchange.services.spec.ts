import type { TokenId } from '$declarations/backend/backend.did';
import { getExchangeRates } from '$lib/api/backend.api';
import { Currency } from '$lib/enums/currency';
import { simplePrice, simpleTokenPrice } from '$lib/rest/coingecko.rest';
import { fetchBatchKongSwapPrices } from '$lib/rest/kongswap.rest';
import {
	exchangeRateICRCToUsd,
	exchangeRateUsdToCurrency,
	fetchAllExchangeRatesFromBackend,
	syncExchange
} from '$lib/services/exchange.services';
import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
import { exchangeStore } from '$lib/stores/exchange.store';
import type { CoingeckoSimpleTokenPriceResponse } from '$lib/types/coingecko';
import type { BackendExchangeRate } from '$lib/types/exchange';
import type { PostMessageDataResponseExchange } from '$lib/types/post-message';
import {
	findMissingLedgerCanisterIds,
	formatKongSwapToCoingeckoPrices
} from '$lib/utils/exchange.utils';
import { tokenIdKey } from '$lib/utils/token-id.utils';
import {
	MOCK_CANISTER_ID_1,
	MOCK_CANISTER_ID_2,
	createMockCoingeckoTokenPrice
} from '$tests/mocks/exchanges.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { Principal } from '@dfinity/principal';
import { nonNullish } from '@dfinity/utils';

vi.mock('$lib/rest/coingecko.rest', () => ({
	simplePrice: vi.fn(),
	simpleTokenPrice: vi.fn()
}));
vi.mock('$lib/rest/kongswap.rest', () => ({
	fetchBatchKongSwapPrices: vi.fn()
}));
vi.mock('$lib/utils/exchange.utils', () => ({
	formatKongSwapToCoingeckoPrices: vi.fn(),
	findMissingLedgerCanisterIds: vi.fn()
}));
vi.mock('$lib/api/backend.api', () => ({
	getExchangeRates: vi.fn()
}));
vi.mock('$env/rest/kongswap.env', () => ({
	KONGSWAP_PROVIDER_ENABLED: true
}));

const mockPrice1 = createMockCoingeckoTokenPrice({ usd: 1.11 });
const mockPrice2 = createMockCoingeckoTokenPrice({ usd: 2.22 });

describe('exchange.services', () => {
	describe('exchangeRateUsdToCurrency', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should return 1 for USD', async () => {
			await expect(exchangeRateUsdToCurrency(Currency.USD)).resolves.toStrictEqual({
				rate: 1,
				fx24hChangeMultiplier: 1
			});

			expect(simplePrice).not.toHaveBeenCalled();
		});

		it('should query the price for BTC to USD and BTC to currency', async () => {
			await exchangeRateUsdToCurrency(Currency.EUR);

			expect(simplePrice).toHaveBeenCalledExactlyOnceWith({
				ids: 'bitcoin',
				vs_currencies: `${Currency.USD},${Currency.EUR}`,
				include_24hr_change: true
			});

			vi.clearAllMocks();

			await exchangeRateUsdToCurrency(Currency.CHF);

			expect(simplePrice).toHaveBeenCalledExactlyOnceWith({
				ids: 'bitcoin',
				vs_currencies: `${Currency.USD},${Currency.CHF}`,
				include_24hr_change: true
			});
		});

		it('should return the correct exchange rate for a valid currency', async () => {
			vi.mocked(simplePrice).mockResolvedValue({
				bitcoin: { usd: 10000, eur: 5000, usd_24h_change: 3, eur_24h_change: 18 }
			});

			const rate = await exchangeRateUsdToCurrency(Currency.EUR);

			expect(rate).toStrictEqual({ rate: 2, fx24hChangeMultiplier: 1.03 / 1.18 }); // 10000 / 5000
		});

		it('should return undefined for a nullish price for BTC', async () => {
			vi.mocked(simplePrice).mockResolvedValue({});

			const rate = await exchangeRateUsdToCurrency(Currency.EUR);

			expect(rate).toBeUndefined();
		});

		it('should return undefined for a nullish price for BTC to currency', async () => {
			vi.mocked(simplePrice).mockResolvedValue({
				bitcoin: { usd: 10000, usd_24h_change: 3, eur_24h_change: 18 }
			});

			const rate = await exchangeRateUsdToCurrency(Currency.EUR);

			expect(rate).toBeUndefined();
		});

		it('should return undefined for a nullish 24-hour change for BTC to currency', async () => {
			vi.mocked(simplePrice).mockResolvedValue({
				bitcoin: { usd: 10000, eur: 5000, usd_24h_change: 3 }
			});

			const rate = await exchangeRateUsdToCurrency(Currency.EUR);

			expect(rate).toBeUndefined();
		});

		it('should throw an error if the price query throws', async () => {
			vi.mocked(simplePrice).mockRejectedValue(new Error('API error'));

			await expect(exchangeRateUsdToCurrency(Currency.EUR)).rejects.toThrow('API error');
		});
	});

	describe('exchangeRateICRCToUsd', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('returns empty object if no canister IDs are provided', async () => {
			const result = await exchangeRateICRCToUsd([]);

			expect(result).toEqual({});
			expect(simpleTokenPrice).not.toHaveBeenCalled();
			expect(findMissingLedgerCanisterIds).not.toHaveBeenCalled();
			expect(fetchBatchKongSwapPrices).not.toHaveBeenCalled();
		});

		it('returns only coingecko prices when all tokens are present', async () => {
			const coingeckoResponse: CoingeckoSimpleTokenPriceResponse = {
				[MOCK_CANISTER_ID_1.toLowerCase()]: mockPrice1,
				[MOCK_CANISTER_ID_2.toLowerCase()]: mockPrice2
			};

			vi.mocked(simpleTokenPrice).mockResolvedValue(coingeckoResponse);
			vi.mocked(findMissingLedgerCanisterIds).mockReturnValue([]);

			const result = await exchangeRateICRCToUsd([MOCK_CANISTER_ID_1, MOCK_CANISTER_ID_2]);

			expect(simpleTokenPrice).toHaveBeenCalledOnce();
			expect(findMissingLedgerCanisterIds).toHaveBeenCalledWith({
				allLedgerCanisterIds: [MOCK_CANISTER_ID_1, MOCK_CANISTER_ID_2],
				coingeckoResponse
			});
			expect(fetchBatchKongSwapPrices).not.toHaveBeenCalled();
			expect(result).toEqual(coingeckoResponse);
		});

		it('merges KongSwap prices when Coingecko is missing some tokens', async () => {
			const partialCoingecko: CoingeckoSimpleTokenPriceResponse = {
				[MOCK_CANISTER_ID_1.toLowerCase()]: mockPrice1
			};
			const fallbackKongSwap: CoingeckoSimpleTokenPriceResponse = {
				[MOCK_CANISTER_ID_2.toLowerCase()]: mockPrice2
			};

			vi.mocked(simpleTokenPrice).mockResolvedValue(partialCoingecko);
			vi.mocked(findMissingLedgerCanisterIds).mockReturnValue([MOCK_CANISTER_ID_2]);
			vi.mocked(fetchBatchKongSwapPrices).mockResolvedValue(['mockRawToken' as never]);
			vi.mocked(formatKongSwapToCoingeckoPrices).mockReturnValue(fallbackKongSwap);

			const result = await exchangeRateICRCToUsd([MOCK_CANISTER_ID_1, MOCK_CANISTER_ID_2]);

			expect(simpleTokenPrice).toHaveBeenCalledOnce();
			expect(findMissingLedgerCanisterIds).toHaveBeenCalledWith({
				allLedgerCanisterIds: [MOCK_CANISTER_ID_1, MOCK_CANISTER_ID_2],
				coingeckoResponse: partialCoingecko
			});
			expect(fetchBatchKongSwapPrices).toHaveBeenCalledWith([MOCK_CANISTER_ID_2]);
			expect(formatKongSwapToCoingeckoPrices).toHaveBeenCalled();
			expect(result).toEqual({
				[MOCK_CANISTER_ID_1.toLowerCase()]: mockPrice1,
				[MOCK_CANISTER_ID_2.toLowerCase()]: mockPrice2
			});
		});

		it('returns only KongSwap prices if Coingecko returns empty object', async () => {
			vi.mocked(simpleTokenPrice).mockResolvedValue({});
			vi.mocked(findMissingLedgerCanisterIds).mockReturnValue([MOCK_CANISTER_ID_1]);
			vi.mocked(fetchBatchKongSwapPrices).mockResolvedValue(['mockRawToken' as never]);
			vi.mocked(formatKongSwapToCoingeckoPrices).mockReturnValue({
				[MOCK_CANISTER_ID_1.toLowerCase()]: mockPrice1
			});

			const result = await exchangeRateICRCToUsd([MOCK_CANISTER_ID_1]);

			expect(simpleTokenPrice).toHaveBeenCalledOnce();
			expect(fetchBatchKongSwapPrices).toHaveBeenCalled();
			expect(result).toEqual({
				[MOCK_CANISTER_ID_1.toLowerCase()]: mockPrice1
			});
		});

		it('skips KongSwap call if no tokens are missing', async () => {
			const coingeckoResponse: CoingeckoSimpleTokenPriceResponse = {
				[MOCK_CANISTER_ID_1.toLowerCase()]: mockPrice1
			};

			vi.mocked(simpleTokenPrice).mockResolvedValue(coingeckoResponse);
			vi.mocked(findMissingLedgerCanisterIds).mockReturnValue([]);

			const result = await exchangeRateICRCToUsd([MOCK_CANISTER_ID_1]);

			expect(fetchBatchKongSwapPrices).not.toHaveBeenCalled();
			expect(formatKongSwapToCoingeckoPrices).not.toHaveBeenCalled();
			expect(result).toEqual(coingeckoResponse);
		});
	});

	describe('fetchAllExchangeRatesFromBackend', () => {
		const mockExchangeRate: BackendExchangeRate = {
			usd: {
				price: 42000,
				price24hChangePct: 1.5,
				marketCap: 800_000_000_000,
				timestampNs: 1_000_000_000n
			}
		};

		const mockRatesMap = (
			...entries: [TokenId, BackendExchangeRate][]
		): Map<string, BackendExchangeRate> =>
			new Map(
				entries.reduce<[string, BackendExchangeRate][]>((acc, [id, rate]) => {
					const key = tokenIdKey(id);
					return nonNullish(key) ? [...acc, [key, rate]] : acc;
				}, [])
			);

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should call getExchangeRates with native + mapped token IDs', async () => {
			vi.mocked(getExchangeRates).mockResolvedValue(new Map());

			await fetchAllExchangeRatesFromBackend({
				identity: mockIdentity,
				erc20Addresses: [{ address: '0xabc', coingeckoId: 'ethereum', chainId: 1n }],
				icrcCanisterIds: ['ryjl3-tyaaa-aaaaa-aaaba-cai'],
				splTokenAddresses: ['SoLaddr1']
			});

			expect(getExchangeRates).toHaveBeenCalledExactlyOnceWith({
				token_ids: [
					{ EvmNative: 1n },
					{ BtcNativeMainnet: null },
					{ IcpNative: null },
					{ SolNativeMainnet: null },
					{ EvmNative: 56n },
					{ EvmNative: 137n },
					{ EvmNative: 42161n },
					{ EvmNative: 8453n },
					{ Erc20: ['0xabc', 1n] },
					{ Icrc: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai') },
					{ SplMainnet: 'SoLaddr1' }
				],
				certified: true,
				identity: mockIdentity
			});
		});

		it('should map backend response to coingecko-shaped prices', async () => {
			const erc20TokenId: TokenId = { Erc20: ['0xabc', 1n] };
			const icrcTokenId: TokenId = {
				Icrc: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai')
			};
			const splTokenId: TokenId = { SplMainnet: 'SoLaddr1' };

			vi.mocked(getExchangeRates).mockResolvedValue(
				mockRatesMap(
					[erc20TokenId, mockExchangeRate],
					[icrcTokenId, mockExchangeRate],
					[splTokenId, mockExchangeRate]
				)
			);

			const result = await fetchAllExchangeRatesFromBackend({
				identity: mockIdentity,
				erc20Addresses: [{ address: '0xabc', coingeckoId: 'ethereum', chainId: 1n }],
				icrcCanisterIds: ['ryjl3-tyaaa-aaaaa-aaaba-cai'],
				splTokenAddresses: ['SoLaddr1']
			});

			const expectedPrice = { usd: 42000, usd_24h_change: 1.5, usd_market_cap: 800_000_000_000 };

			expect(result.currentErc20Prices).toEqual({ '0xabc': expectedPrice });
			expect(result.currentIcrcPrices).toEqual({
				'ryjl3-tyaaa-aaaaa-aaaba-cai': expectedPrice
			});
			expect(result.currentSplPrices).toEqual({ SoLaddr1: expectedPrice });
		});

		it('should return empty objects and undefined native prices when no rates are returned', async () => {
			vi.mocked(getExchangeRates).mockResolvedValue(new Map());

			const result = await fetchAllExchangeRatesFromBackend({
				identity: mockIdentity,
				erc20Addresses: [{ address: '0xabc', coingeckoId: 'ethereum', chainId: 1n }],
				icrcCanisterIds: ['ryjl3-tyaaa-aaaaa-aaaba-cai'],
				splTokenAddresses: ['SoLaddr1']
			});

			expect(result.currentEthPrice).toBeUndefined();
			expect(result.currentBtcPrice).toBeUndefined();
			expect(result.currentIcpPrice).toBeUndefined();
			expect(result.currentSolPrice).toBeUndefined();
			expect(result.currentBnbPrice).toBeUndefined();
			expect(result.currentPolPrice).toBeUndefined();
			expect(result.currentArbitrumEthPrice).toBeUndefined();
			expect(result.currentBaseEthPrice).toBeUndefined();
			expect(result.currentErc20Prices).toEqual({});
			expect(result.currentIcrcPrices).toEqual({});
			expect(result.currentSplPrices).toEqual({});
		});

		it('should skip rates with no price', async () => {
			const noPriceRate: BackendExchangeRate = {
				usd: {
					price: undefined,
					price24hChangePct: 1.5,
					marketCap: 100,
					timestampNs: 1n
				}
			};

			vi.mocked(getExchangeRates).mockResolvedValue(
				mockRatesMap([{ Erc20: ['0xabc', 1n] }, noPriceRate])
			);

			const result = await fetchAllExchangeRatesFromBackend({
				identity: mockIdentity,
				erc20Addresses: [{ address: '0xabc', coingeckoId: 'ethereum', chainId: 1n }],
				icrcCanisterIds: [],
				splTokenAddresses: []
			});

			expect(result.currentErc20Prices).toEqual({});
		});

		it('should handle empty exchange rate (not found)', async () => {
			vi.mocked(getExchangeRates).mockResolvedValue(new Map());

			const result = await fetchAllExchangeRatesFromBackend({
				identity: mockIdentity,
				erc20Addresses: [{ address: '0xabc', coingeckoId: 'ethereum', chainId: 1n }],
				icrcCanisterIds: [],
				splTokenAddresses: []
			});

			expect(result.currentErc20Prices).toEqual({});
		});

		it('should include erc20 addresses via chainId regardless of coingeckoId', async () => {
			vi.mocked(getExchangeRates).mockResolvedValue(new Map());

			await fetchAllExchangeRatesFromBackend({
				identity: mockIdentity,
				// @ts-expect-error Testing with non-standard coingeckoId
				erc20Addresses: [{ address: '0xabc', coingeckoId: 'some-unknown-chain', chainId: 999n }],
				icrcCanisterIds: [],
				splTokenAddresses: []
			});

			expect(getExchangeRates).toHaveBeenCalledWith(
				expect.objectContaining({
					token_ids: [
						{ EvmNative: 1n },
						{ BtcNativeMainnet: null },
						{ IcpNative: null },
						{ SolNativeMainnet: null },
						{ EvmNative: 56n },
						{ EvmNative: 137n },
						{ EvmNative: 42161n },
						{ EvmNative: 8453n },
						{ Erc20: ['0xabc', 999n] }
					]
				})
			);
		});

		it('should return native token prices from backend', async () => {
			vi.mocked(getExchangeRates).mockResolvedValue(
				mockRatesMap(
					[{ EvmNative: 1n }, mockExchangeRate],
					[{ BtcNativeMainnet: null }, mockExchangeRate],
					[{ IcpNative: null }, mockExchangeRate],
					[{ SolNativeMainnet: null }, mockExchangeRate],
					[{ EvmNative: 56n }, mockExchangeRate],
					[{ EvmNative: 137n }, mockExchangeRate],
					[{ EvmNative: 42161n }, mockExchangeRate],
					[{ EvmNative: 8453n }, mockExchangeRate]
				)
			);

			const result = await fetchAllExchangeRatesFromBackend({
				identity: mockIdentity,
				erc20Addresses: [],
				icrcCanisterIds: [],
				splTokenAddresses: []
			});

			const expectedPrice = { usd: 42000, usd_24h_change: 1.5, usd_market_cap: 800_000_000_000 };

			expect(result.currentEthPrice).toEqual({ ethereum: expectedPrice });
			expect(result.currentBtcPrice).toEqual({ bitcoin: expectedPrice });
			expect(result.currentIcpPrice).toEqual({ 'internet-computer': expectedPrice });
			expect(result.currentSolPrice).toEqual({ solana: expectedPrice });
			expect(result.currentBnbPrice).toEqual({ binancecoin: expectedPrice });
			expect(result.currentPolPrice).toEqual({ 'polygon-ecosystem-token': expectedPrice });
			expect(result.currentArbitrumEthPrice).toEqual({ ethereum: expectedPrice });
			expect(result.currentBaseEthPrice).toEqual({ ethereum: expectedPrice });
		});

		it('should handle missing optional fields in BackendExchangeRate', async () => {
			const partialRate: BackendExchangeRate = {
				usd: {
					price: 100,
					price24hChangePct: undefined,
					marketCap: undefined,
					timestampNs: 1n
				}
			};

			vi.mocked(getExchangeRates).mockResolvedValue(
				mockRatesMap([{ Erc20: ['0xabc', 1n] }, partialRate])
			);

			const result = await fetchAllExchangeRatesFromBackend({
				identity: mockIdentity,
				erc20Addresses: [{ address: '0xabc', coingeckoId: 'ethereum', chainId: 1n }],
				icrcCanisterIds: [],
				splTokenAddresses: []
			});

			expect(result.currentErc20Prices).toEqual({
				'0xabc': { usd: 100, usd_24h_change: undefined, usd_market_cap: 0 }
			});
		});
	});

	describe('syncExchange', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			exchangeStore.reset();
		});

		it('should not update stores when data is undefined', () => {
			const exchangeSetSpy = vi.spyOn(exchangeStore, 'set');
			const currencySetSpy = vi.spyOn(currencyExchangeStore, 'setExchangeRateCurrency');

			syncExchange(undefined);

			expect(exchangeSetSpy).not.toHaveBeenCalled();
			expect(currencySetSpy).not.toHaveBeenCalled();
		});

		it('should update exchange store with non-nullish price data', () => {
			const exchangeSetSpy = vi.spyOn(exchangeStore, 'set');

			const data: PostMessageDataResponseExchange = {
				currentExchangeRate: {
					exchangeRateToUsd: 1,
					exchangeRate24hChangeMultiplier: 1,
					currency: Currency.USD
				},
				currentEthPrice: { ethereum: { usd: 3000 } },
				currentBtcPrice: undefined,
				currentErc20Prices: { '0xabc': { usd: 1, usd_market_cap: 100 } },
				currentIcpPrice: undefined,
				currentIcrcPrices: {},
				currentSolPrice: undefined,
				currentSplPrices: {},
				currentErc4626Prices: {},
				currentBnbPrice: undefined,
				currentPolPrice: undefined
			};

			syncExchange(data);

			expect(exchangeSetSpy).toHaveBeenCalledExactlyOnceWith([
				{ ethereum: { usd: 3000 } },
				{ '0xabc': { usd: 1, usd_market_cap: 100 } },
				{},
				{},
				{}
			]);
		});

		it('should update currency exchange store when currentExchangeRate is provided', () => {
			const currencySpy = vi.spyOn(currencyExchangeStore, 'setExchangeRateCurrency');
			const rateSpy = vi.spyOn(currencyExchangeStore, 'setExchangeRate');
			const multiplierSpy = vi.spyOn(currencyExchangeStore, 'setExchangeRate24hChangeMultiplier');

			const data: PostMessageDataResponseExchange = {
				currentExchangeRate: {
					exchangeRateToUsd: 0.85,
					exchangeRate24hChangeMultiplier: 1.02,
					currency: Currency.EUR
				},
				currentErc20Prices: {},
				currentIcrcPrices: {},
				currentSplPrices: {},
				currentErc4626Prices: {}
			};

			syncExchange(data);

			expect(currencySpy).toHaveBeenCalledExactlyOnceWith(Currency.EUR);
			expect(rateSpy).toHaveBeenCalledExactlyOnceWith(0.85);
			expect(multiplierSpy).toHaveBeenCalledExactlyOnceWith(1.02);
		});

		it('should not update currency exchange store when currentExchangeRate is missing', () => {
			const currencySpy = vi.spyOn(currencyExchangeStore, 'setExchangeRateCurrency');

			const data: PostMessageDataResponseExchange = {
				currentErc20Prices: {},
				currentIcrcPrices: {},
				currentSplPrices: {},
				currentErc4626Prices: {}
			};

			syncExchange(data);

			expect(currencySpy).not.toHaveBeenCalled();
		});
	});
});
