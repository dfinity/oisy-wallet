import type { TokenId } from '$declarations/backend/backend.did';
import { getExchangeRates } from '$lib/api/backend.api';
import { Currency } from '$lib/enums/currency';
import { simplePrice, simpleTokenPrice } from '$lib/rest/coingecko.rest';
import { fetchBatchIcpSwapPrices } from '$lib/rest/icpswap.rest';
import { fetchBatchKongSwapPrices } from '$lib/rest/kongswap.rest';
import {
	exchangeRateICRCToUsd,
	exchangeRateUsdToCurrency,
	fetchExchangeRatesFromBackend,
	fillIcrcPricesFromFallbackProviders,
	syncExchange
} from '$lib/services/exchange.services';
import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
import { exchangeStore } from '$lib/stores/exchange.store';
import type { CoingeckoSimpleTokenPriceResponse } from '$lib/types/coingecko';
import type { BackendExchangeRate } from '$lib/types/exchange';
import type { PostMessageDataResponseExchange } from '$lib/types/post-message';
import {
	findMissingLedgerCanisterIds,
	formatIcpSwapToCoingeckoPrices,
	formatKongSwapToCoingeckoPrices
} from '$lib/utils/exchange.utils';
import {
	MOCK_CANISTER_ID_1,
	MOCK_CANISTER_ID_2,
	createMockCoingeckoTokenPrice
} from '$tests/mocks/exchanges.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { Principal } from '@dfinity/principal';

vi.mock('$lib/rest/coingecko.rest', () => ({
	simplePrice: vi.fn(),
	simpleTokenPrice: vi.fn()
}));
vi.mock('$lib/rest/icpswap.rest', () => ({
	fetchBatchIcpSwapPrices: vi.fn()
}));
vi.mock('$lib/rest/kongswap.rest', () => ({
	fetchBatchKongSwapPrices: vi.fn()
}));
vi.mock('$lib/utils/exchange.utils', () => ({
	formatIcpSwapToCoingeckoPrices: vi.fn(),
	formatKongSwapToCoingeckoPrices: vi.fn(),
	findMissingLedgerCanisterIds: vi.fn()
}));
vi.mock('$lib/api/backend.api', () => ({
	getExchangeRates: vi.fn()
}));
vi.mock('$env/rest/icpswap.env', () => ({
	ICPSWAP_PROVIDER_ENABLED: true
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
			expect(fetchBatchIcpSwapPrices).not.toHaveBeenCalled();
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
			expect(fetchBatchIcpSwapPrices).not.toHaveBeenCalled();
			expect(fetchBatchKongSwapPrices).not.toHaveBeenCalled();
			expect(result).toEqual(coingeckoResponse);
		});

		it('fills missing tokens from ICPSwap before trying KongSwap', async () => {
			const partialCoingecko: CoingeckoSimpleTokenPriceResponse = {
				[MOCK_CANISTER_ID_1.toLowerCase()]: mockPrice1
			};
			const icpSwapFallback: CoingeckoSimpleTokenPriceResponse = {
				[MOCK_CANISTER_ID_2.toLowerCase()]: mockPrice2
			};

			vi.mocked(simpleTokenPrice).mockResolvedValue(partialCoingecko);
			vi.mocked(findMissingLedgerCanisterIds)
				.mockReturnValueOnce([MOCK_CANISTER_ID_2])
				.mockReturnValueOnce([]);
			vi.mocked(fetchBatchIcpSwapPrices).mockResolvedValue(['mockRawToken' as never]);
			vi.mocked(formatIcpSwapToCoingeckoPrices).mockReturnValue(icpSwapFallback);

			const result = await exchangeRateICRCToUsd([MOCK_CANISTER_ID_1, MOCK_CANISTER_ID_2]);

			expect(simpleTokenPrice).toHaveBeenCalledOnce();
			expect(fetchBatchIcpSwapPrices).toHaveBeenCalledWith([MOCK_CANISTER_ID_2]);
			expect(formatIcpSwapToCoingeckoPrices).toHaveBeenCalled();
			expect(fetchBatchKongSwapPrices).not.toHaveBeenCalled();
			expect(result).toEqual({
				[MOCK_CANISTER_ID_1.toLowerCase()]: mockPrice1,
				[MOCK_CANISTER_ID_2.toLowerCase()]: mockPrice2
			});
		});

		it('falls back to KongSwap for tokens still missing after ICPSwap', async () => {
			const partialCoingecko: CoingeckoSimpleTokenPriceResponse = {
				[MOCK_CANISTER_ID_1.toLowerCase()]: mockPrice1
			};
			const kongSwapFallback: CoingeckoSimpleTokenPriceResponse = {
				[MOCK_CANISTER_ID_2.toLowerCase()]: mockPrice2
			};

			vi.mocked(simpleTokenPrice).mockResolvedValue(partialCoingecko);
			vi.mocked(findMissingLedgerCanisterIds)
				.mockReturnValueOnce([MOCK_CANISTER_ID_2])
				.mockReturnValueOnce([MOCK_CANISTER_ID_2]);
			vi.mocked(fetchBatchIcpSwapPrices).mockResolvedValue([]);
			vi.mocked(formatIcpSwapToCoingeckoPrices).mockReturnValue({});
			vi.mocked(fetchBatchKongSwapPrices).mockResolvedValue(['mockRawToken' as never]);
			vi.mocked(formatKongSwapToCoingeckoPrices).mockReturnValue(kongSwapFallback);

			const result = await exchangeRateICRCToUsd([MOCK_CANISTER_ID_1, MOCK_CANISTER_ID_2]);

			expect(fetchBatchIcpSwapPrices).toHaveBeenCalledWith([MOCK_CANISTER_ID_2]);
			expect(fetchBatchKongSwapPrices).toHaveBeenCalledWith([MOCK_CANISTER_ID_2]);
			expect(result).toEqual({
				[MOCK_CANISTER_ID_1.toLowerCase()]: mockPrice1,
				[MOCK_CANISTER_ID_2.toLowerCase()]: mockPrice2
			});
		});

		it('returns only fallback prices if Coingecko returns empty object', async () => {
			const icpSwapPrices: CoingeckoSimpleTokenPriceResponse = {
				[MOCK_CANISTER_ID_1.toLowerCase()]: mockPrice1
			};

			vi.mocked(simpleTokenPrice).mockResolvedValue({});
			vi.mocked(findMissingLedgerCanisterIds)
				.mockReturnValueOnce([MOCK_CANISTER_ID_1])
				.mockReturnValueOnce([]);
			vi.mocked(fetchBatchIcpSwapPrices).mockResolvedValue(['mockRawToken' as never]);
			vi.mocked(formatIcpSwapToCoingeckoPrices).mockReturnValue(icpSwapPrices);

			const result = await exchangeRateICRCToUsd([MOCK_CANISTER_ID_1]);

			expect(simpleTokenPrice).toHaveBeenCalledOnce();
			expect(fetchBatchIcpSwapPrices).toHaveBeenCalled();
			expect(fetchBatchKongSwapPrices).not.toHaveBeenCalled();
			expect(result).toEqual({
				[MOCK_CANISTER_ID_1.toLowerCase()]: mockPrice1
			});
		});

		it('skips all fallbacks if no tokens are missing', async () => {
			const coingeckoResponse: CoingeckoSimpleTokenPriceResponse = {
				[MOCK_CANISTER_ID_1.toLowerCase()]: mockPrice1
			};

			vi.mocked(simpleTokenPrice).mockResolvedValue(coingeckoResponse);
			vi.mocked(findMissingLedgerCanisterIds).mockReturnValue([]);

			const result = await exchangeRateICRCToUsd([MOCK_CANISTER_ID_1]);

			expect(fetchBatchIcpSwapPrices).not.toHaveBeenCalled();
			expect(fetchBatchKongSwapPrices).not.toHaveBeenCalled();
			expect(formatIcpSwapToCoingeckoPrices).not.toHaveBeenCalled();
			expect(formatKongSwapToCoingeckoPrices).not.toHaveBeenCalled();
			expect(result).toEqual(coingeckoResponse);
		});
	});

	describe('fillIcrcPricesFromFallbackProviders', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('starts the cascade from an empty map and never calls CoinGecko', async () => {
			const icpSwapFallback: CoingeckoSimpleTokenPriceResponse = {
				[MOCK_CANISTER_ID_1.toLowerCase()]: mockPrice1
			};

			vi.mocked(findMissingLedgerCanisterIds)
				.mockReturnValueOnce([MOCK_CANISTER_ID_1])
				.mockReturnValueOnce([]);
			vi.mocked(fetchBatchIcpSwapPrices).mockResolvedValue(['mockRawToken' as never]);
			vi.mocked(formatIcpSwapToCoingeckoPrices).mockReturnValue(icpSwapFallback);

			const result = await fillIcrcPricesFromFallbackProviders({
				ledgerCanisterIds: [MOCK_CANISTER_ID_1]
			});

			expect(simpleTokenPrice).not.toHaveBeenCalled();
			expect(findMissingLedgerCanisterIds).toHaveBeenCalledWith({
				allLedgerCanisterIds: [MOCK_CANISTER_ID_1],
				coingeckoResponse: {}
			});
			expect(fetchBatchIcpSwapPrices).toHaveBeenCalledWith([MOCK_CANISTER_ID_1]);
			expect(result).toEqual(icpSwapFallback);
		});

		it('fills only the ids missing from the provided initial prices', async () => {
			const initialPrices: CoingeckoSimpleTokenPriceResponse = {
				[MOCK_CANISTER_ID_1.toLowerCase()]: mockPrice1
			};
			const icpSwapFallback: CoingeckoSimpleTokenPriceResponse = {
				[MOCK_CANISTER_ID_2.toLowerCase()]: mockPrice2
			};

			vi.mocked(findMissingLedgerCanisterIds)
				.mockReturnValueOnce([MOCK_CANISTER_ID_2])
				.mockReturnValueOnce([]);
			vi.mocked(fetchBatchIcpSwapPrices).mockResolvedValue(['mockRawToken' as never]);
			vi.mocked(formatIcpSwapToCoingeckoPrices).mockReturnValue(icpSwapFallback);

			const result = await fillIcrcPricesFromFallbackProviders({
				ledgerCanisterIds: [MOCK_CANISTER_ID_1, MOCK_CANISTER_ID_2],
				initialPrices
			});

			expect(simpleTokenPrice).not.toHaveBeenCalled();
			expect(fetchBatchIcpSwapPrices).toHaveBeenCalledWith([MOCK_CANISTER_ID_2]);
			expect(result).toEqual({ ...initialPrices, ...icpSwapFallback });
		});

		it('falls back to KongSwap for ids still missing after ICPSwap', async () => {
			const kongSwapFallback: CoingeckoSimpleTokenPriceResponse = {
				[MOCK_CANISTER_ID_1.toLowerCase()]: mockPrice1
			};

			vi.mocked(findMissingLedgerCanisterIds)
				.mockReturnValueOnce([MOCK_CANISTER_ID_1])
				.mockReturnValueOnce([MOCK_CANISTER_ID_1]);
			vi.mocked(fetchBatchIcpSwapPrices).mockResolvedValue([]);
			vi.mocked(formatIcpSwapToCoingeckoPrices).mockReturnValue({});
			vi.mocked(fetchBatchKongSwapPrices).mockResolvedValue(['mockRawToken' as never]);
			vi.mocked(formatKongSwapToCoingeckoPrices).mockReturnValue(kongSwapFallback);

			const result = await fillIcrcPricesFromFallbackProviders({
				ledgerCanisterIds: [MOCK_CANISTER_ID_1]
			});

			expect(fetchBatchKongSwapPrices).toHaveBeenCalledWith([MOCK_CANISTER_ID_1]);
			expect(result).toEqual(kongSwapFallback);
		});

		it('returns the initial prices untouched when nothing is missing', async () => {
			const initialPrices: CoingeckoSimpleTokenPriceResponse = {
				[MOCK_CANISTER_ID_1.toLowerCase()]: mockPrice1
			};

			vi.mocked(findMissingLedgerCanisterIds).mockReturnValue([]);

			const result = await fillIcrcPricesFromFallbackProviders({
				ledgerCanisterIds: [MOCK_CANISTER_ID_1],
				initialPrices
			});

			expect(fetchBatchIcpSwapPrices).not.toHaveBeenCalled();
			expect(fetchBatchKongSwapPrices).not.toHaveBeenCalled();
			expect(result).toEqual(initialPrices);
		});
	});

	describe('fetchExchangeRatesFromBackend', () => {
		const mockExchangeRate: BackendExchangeRate = {
			usd: {
				price: 42000,
				price24hChangePct: 1.5,
				marketCap: 800_000_000_000,
				timestampNs: 1_000_000_000n
			}
		};

		const expectedPrice = {
			usd: 42000,
			usd_24h_change: 1.5,
			usd_market_cap: 800_000_000_000,
			last_updated_at: 1000
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should call getExchangeRates with no arguments other than identity', async () => {
			vi.mocked(getExchangeRates).mockResolvedValue([]);

			await fetchExchangeRatesFromBackend({ identity: mockIdentity });

			expect(getExchangeRates).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity
			});
		});

		it('should bucket the backend response by token variant', async () => {
			const erc20TokenId: TokenId = { Erc20: ['0xABC', 1n] };
			const icrcTokenId: TokenId = {
				Icrc: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai')
			};
			const splTokenId: TokenId = { SplMainnet: 'SoLaddr1' };

			vi.mocked(getExchangeRates).mockResolvedValue([
				[erc20TokenId, mockExchangeRate],
				[icrcTokenId, mockExchangeRate],
				[splTokenId, mockExchangeRate]
			]);

			const result = await fetchExchangeRatesFromBackend({ identity: mockIdentity });

			expect(result.currentErc20Prices).toEqual({ '0xabc': expectedPrice });
			expect(result.currentIcrcPrices).toEqual({
				'ryjl3-tyaaa-aaaaa-aaaba-cai': expectedPrice
			});
			expect(result.currentSplPrices).toEqual({ SoLaddr1: expectedPrice });
		});

		it('should return undefined native prices and empty maps when the backend returns nothing', async () => {
			vi.mocked(getExchangeRates).mockResolvedValue([]);

			const result = await fetchExchangeRatesFromBackend({ identity: mockIdentity });

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

		it('should expose native token prices when the backend provides them', async () => {
			vi.mocked(getExchangeRates).mockResolvedValue([
				[{ EvmNative: 1n }, mockExchangeRate],
				[{ BtcNativeMainnet: null }, mockExchangeRate],
				[{ IcpNative: null }, mockExchangeRate],
				[{ SolNativeMainnet: null }, mockExchangeRate],
				[{ EvmNative: 56n }, mockExchangeRate],
				[{ EvmNative: 137n }, mockExchangeRate],
				[{ EvmNative: 42161n }, mockExchangeRate],
				[{ EvmNative: 8453n }, mockExchangeRate]
			]);

			const result = await fetchExchangeRatesFromBackend({ identity: mockIdentity });

			expect(result.currentEthPrice).toEqual({ ethereum: expectedPrice });
			expect(result.currentBtcPrice).toEqual({ bitcoin: expectedPrice });
			expect(result.currentIcpPrice).toEqual({ 'internet-computer': expectedPrice });
			expect(result.currentSolPrice).toEqual({ solana: expectedPrice });
			expect(result.currentBnbPrice).toEqual({ binancecoin: expectedPrice });
			expect(result.currentPolPrice).toEqual({ 'polygon-ecosystem-token': expectedPrice });
			expect(result.currentArbitrumEthPrice).toEqual({ ethereum: expectedPrice });
			expect(result.currentBaseEthPrice).toEqual({ ethereum: expectedPrice });
		});

		it('should skip entries whose price is missing', async () => {
			const noPriceRate: BackendExchangeRate = {
				usd: {
					price: undefined,
					price24hChangePct: 1.5,
					marketCap: 100,
					timestampNs: 1n
				}
			};

			vi.mocked(getExchangeRates).mockResolvedValue([
				[{ Erc20: ['0xabc', 1n] }, noPriceRate],
				[{ Erc20: ['0xdef', 1n] }, undefined]
			]);

			const result = await fetchExchangeRatesFromBackend({ identity: mockIdentity });

			expect(result.currentErc20Prices).toEqual({});
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

	describe('with COINGECKO_PROVIDER_ENABLED off', () => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();

			vi.doMock('$env/rest/coingecko.env', () => ({
				COINGECKO_PROVIDER_ENABLED: false
			}));
		});

		afterEach(() => {
			vi.doUnmock('$env/rest/coingecko.env');
		});

		// After `vi.resetModules()` the dynamically imported service may bind to a freshly
		// instantiated mock module, so every assertion re-imports the mocked module and
		// asserts on that instance instead of the file-scope import.
		it('should short-circuit the native helpers without calling Coingecko', async () => {
			const services = await import('$lib/services/exchange.services');
			const coingeckoRest = await import('$lib/rest/coingecko.rest');

			await expect(services.exchangeRateETHToUsd()).resolves.toEqual({});
			await expect(services.exchangeRateBTCToUsd()).resolves.toEqual({});
			await expect(services.exchangeRateICPToUsd()).resolves.toEqual({});
			await expect(services.exchangeRateSOLToUsd()).resolves.toEqual({});
			await expect(services.exchangeRateBNBToUsd()).resolves.toEqual({});
			await expect(services.exchangeRatePOLToUsd()).resolves.toEqual({});

			expect(coingeckoRest.simplePrice).not.toHaveBeenCalled();
		});

		it('should short-circuit the ERC-20 helper without calling Coingecko', async () => {
			const services = await import('$lib/services/exchange.services');
			const coingeckoRest = await import('$lib/rest/coingecko.rest');

			const result = await services.exchangeRateERC20ToUsd({
				coingeckoPlatformId: 'ethereum',
				contractAddresses: [{ address: '0xabc' }]
			});

			expect(result).toEqual({});
			expect(coingeckoRest.simpleTokenPrice).not.toHaveBeenCalled();
		});

		it('should short-circuit the SPL helper without calling Coingecko', async () => {
			const services = await import('$lib/services/exchange.services');
			const coingeckoRest = await import('$lib/rest/coingecko.rest');

			const result = await services.exchangeRateSPLToUsd(['SoLaddr1']);

			expect(result).toEqual({});
			expect(coingeckoRest.simpleTokenPrice).not.toHaveBeenCalled();
		});

		it('should short-circuit the FX helper for non-USD without calling Coingecko', async () => {
			const services = await import('$lib/services/exchange.services');
			const coingeckoRest = await import('$lib/rest/coingecko.rest');

			const result = await services.exchangeRateUsdToCurrency(Currency.EUR);

			expect(result).toBeUndefined();
			expect(coingeckoRest.simplePrice).not.toHaveBeenCalled();
		});

		it('should still return 1 for USD in the FX helper', async () => {
			const services = await import('$lib/services/exchange.services');
			const coingeckoRest = await import('$lib/rest/coingecko.rest');

			await expect(services.exchangeRateUsdToCurrency(Currency.USD)).resolves.toStrictEqual({
				rate: 1,
				fx24hChangeMultiplier: 1
			});

			expect(coingeckoRest.simplePrice).not.toHaveBeenCalled();
		});

		it('should start the ICRC cascade from {} and still return ICPSwap results', async () => {
			const icpSwapFallback: CoingeckoSimpleTokenPriceResponse = {
				[MOCK_CANISTER_ID_1.toLowerCase()]: mockPrice1
			};

			const exchangeUtils = await import('$lib/utils/exchange.utils');
			const icpSwapRest = await import('$lib/rest/icpswap.rest');

			vi.mocked(exchangeUtils.findMissingLedgerCanisterIds)
				.mockReturnValueOnce([MOCK_CANISTER_ID_1])
				.mockReturnValueOnce([]);
			vi.mocked(icpSwapRest.fetchBatchIcpSwapPrices).mockResolvedValue(['mockRawToken' as never]);
			vi.mocked(exchangeUtils.formatIcpSwapToCoingeckoPrices).mockReturnValue(icpSwapFallback);

			const services = await import('$lib/services/exchange.services');
			const coingeckoRest = await import('$lib/rest/coingecko.rest');

			const result = await services.exchangeRateICRCToUsd([MOCK_CANISTER_ID_1]);

			expect(coingeckoRest.simpleTokenPrice).not.toHaveBeenCalled();
			expect(exchangeUtils.findMissingLedgerCanisterIds).toHaveBeenCalledWith({
				allLedgerCanisterIds: [MOCK_CANISTER_ID_1],
				coingeckoResponse: {}
			});
			expect(icpSwapRest.fetchBatchIcpSwapPrices).toHaveBeenCalledWith([MOCK_CANISTER_ID_1]);
			expect(result).toEqual(icpSwapFallback);
		});
	});
});
