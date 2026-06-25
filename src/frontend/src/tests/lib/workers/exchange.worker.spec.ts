import type { TokenId } from '$declarations/backend/backend.did';
import { calculateErc4626Prices } from '$eth/services/erc4626-exchange.services';
import type { Erc20ContractAddressWithNetwork } from '$icp-eth/types/icrc-erc20';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import { getExchangeRates } from '$lib/api/backend.api';
import { SYNC_EXCHANGE_TIMER_INTERVAL } from '$lib/constants/exchange.constants';
import { Currency } from '$lib/enums/currency';
import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import { simplePrice, simpleTokenPrice } from '$lib/rest/coingecko.rest';
import { fetchBatchIcpSwapPrices } from '$lib/rest/icpswap.rest';
import { fetchBatchKongSwapPrices } from '$lib/rest/kongswap.rest';
import type {
	CoingeckoSimpleErc4626TokenPriceResponse,
	CoingeckoSimplePriceParams,
	CoingeckoSimplePriceResponse,
	CoingeckoSimpleTokenPriceParams,
	CoingeckoSimpleTokenPriceResponse
} from '$lib/types/coingecko';
import type { BackendExchangeRate } from '$lib/types/exchange';
import type { PostMessage, PostMessageDataRequestExchangeTimer } from '$lib/types/post-message';
import { onExchangeMessage } from '$lib/workers/exchange.worker';
import type { SplTokenAddress } from '$sol/types/spl';
import { createMockIcpSwapToken } from '$tests/mocks/icpswap.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { createMockEvent, excludeValidMessageEvents } from '$tests/mocks/workers.mock';
import { Principal } from '@dfinity/principal';

const { backendExchangeEnabled, coingeckoFallbackEnabled } = vi.hoisted(() => ({
	backendExchangeEnabled: { current: false },
	coingeckoFallbackEnabled: { current: false }
}));

vi.mock('$env/exchange.env', () => ({
	get BACKEND_EXCHANGE_ENABLED() {
		return backendExchangeEnabled.current;
	},
	EXCHANGE_DISABLED: false
}));

vi.mock('$env/rest/coingecko.env', async (importActual) => ({
	...(await importActual()),
	get COINGECKO_FALLBACK_PROVIDER_ENABLED() {
		return coingeckoFallbackEnabled.current;
	}
}));

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

vi.mock('$env/rest/icpswap.env', () => ({
	ICPSWAP_PROVIDER_ENABLED: true
}));

vi.mock('$env/rest/kongswap.env', () => ({
	KONGSWAP_PROVIDER_ENABLED: true
}));

vi.mock('$eth/services/erc4626-exchange.services', () => ({
	calculateErc4626Prices: vi.fn()
}));

vi.mock('$lib/api/backend.api', () => ({
	getExchangeRates: vi.fn()
}));

vi.mock('$lib/providers/auth-client.providers', async (importActual) => {
	const authClientProvider = vi.fn().mockReturnValue({
		loadIdentity: vi.fn()
	});

	return {
		...(await importActual()),
		AuthClientProvider: Object.assign(authClientProvider, {
			getInstance: authClientProvider
		})
	};
});

describe('exchange.worker', () => {
	describe('onExchangeMessage', () => {
		let originalPostMessage: unknown;

		const invalidMessages = excludeValidMessageEvents(['stopExchangeTimer', 'startExchangeTimer']);

		const createEvent = (msg: string) =>
			createMockEvent(msg) as unknown as MessageEvent<
				PostMessage<PostMessageDataRequestExchangeTimer>
			>;

		const postMessageMock = vi.fn();

		beforeAll(() => {
			originalPostMessage = window.postMessage;
			window.postMessage = postMessageMock;
		});

		beforeEach(() => {
			vi.clearAllMocks();
			vi.useFakeTimers();

			const provider = AuthClientProvider.getInstance();
			vi.mocked(provider.loadIdentity).mockResolvedValue(mockIdentity);

			vi.mocked(simplePrice).mockImplementation(
				({ ids }: CoingeckoSimplePriceParams): Promise<CoingeckoSimplePriceResponse> =>
					Promise.resolve(
						(Array.isArray(ids) ? ids : ids.split(',')).reduce(
							(acc, id) => ({ ...acc, [id]: { usd: 1 } }),
							{}
						)
					)
			);

			vi.mocked(simpleTokenPrice).mockImplementation(
				({
					contract_addresses
				}: CoingeckoSimpleTokenPriceParams): Promise<CoingeckoSimpleTokenPriceResponse> =>
					Promise.resolve(
						(Array.isArray(contract_addresses)
							? contract_addresses
							: contract_addresses.split(',')
						).reduce((acc, address) => ({ ...acc, [address]: { usd: 1 } }), {})
					)
			);

			vi.mocked(calculateErc4626Prices).mockResolvedValue({});
		});

		afterEach(() => {
			const event = createEvent('stopExchangeTimer');
			onExchangeMessage(event);

			vi.useRealTimers();
		});

		afterAll(() => {
			// @ts-expect-error redo original
			window.postMessage = originalPostMessage;
		});

		describe('with message startExchangeTimer', () => {
			const mockErc20ContractAddresses: Erc20ContractAddressWithNetwork[] = [
				{ address: '0x123', coingeckoId: 'ethereum', chainId: 1n },
				{ address: '0x456', coingeckoId: 'base', chainId: 8453n },
				{ address: '0x789', coingeckoId: 'binance-smart-chain', chainId: 56n },
				{ address: '0xabc', coingeckoId: 'ethereum', chainId: 1n },
				{ address: '0xdef', coingeckoId: 'polygon-pos', chainId: 137n },
				{ address: '0xghi', coingeckoId: 'arbitrum-one', chainId: 42161n }
			];
			const mockIcrcLedgerCanisterIds: LedgerCanisterIdText[] = ['icrc1', 'icrc2'];
			const mockSplTokenAddresses: SplTokenAddress[] = ['spl1', 'spl2'];

			const msg = 'startExchangeTimer' as const;

			const event = createEvent(msg);

			const mockEventData = {
				data: {
					currentCurrency: Currency.USD,
					erc20Addresses: mockErc20ContractAddresses,
					icrcCanisterIds: mockIcrcLedgerCanisterIds,
					splAddresses: mockSplTokenAddresses,
					erc4626TokensExchangeData: []
				}
			};

			it('should sync prices for native tokens', async () => {
				await onExchangeMessage(event);

				expect(simplePrice).toHaveBeenCalledTimes(6);
				expect(simplePrice).toHaveBeenNthCalledWith(1, {
					ids: 'ethereum',
					vs_currencies: Currency.USD,
					include_24hr_change: true
				});
				expect(simplePrice).toHaveBeenNthCalledWith(2, {
					ids: 'bitcoin',
					vs_currencies: Currency.USD,
					include_24hr_change: true
				});
				expect(simplePrice).toHaveBeenNthCalledWith(3, {
					ids: 'internet-computer',
					vs_currencies: Currency.USD,
					include_24hr_change: true
				});
				expect(simplePrice).toHaveBeenNthCalledWith(4, {
					ids: 'solana',
					vs_currencies: Currency.USD,
					include_24hr_change: true
				});
				expect(simplePrice).toHaveBeenNthCalledWith(5, {
					ids: 'binancecoin',
					vs_currencies: Currency.USD,
					include_24hr_change: true
				});
				expect(simplePrice).toHaveBeenNthCalledWith(6, {
					ids: 'polygon-ecosystem-token',
					vs_currencies: Currency.USD,
					include_24hr_change: true
				});
			});

			it('should post a message with synced prices', async () => {
				await onExchangeMessage(event);

				expect(postMessageMock).toHaveBeenCalledExactlyOnceWith({
					msg: 'syncExchange',
					data: {
						currentExchangeRate: {
							exchangeRateToUsd: 1,
							exchangeRate24hChangeMultiplier: 1,
							currency: Currency.USD
						},
						currentBnbPrice: { binancecoin: { usd: 1 } },
						currentBtcPrice: { bitcoin: { usd: 1 } },
						currentErc20Prices: {},
						currentErc4626Prices: {},
						currentEthPrice: { ethereum: { usd: 1 } },
						currentIcpPrice: { 'internet-computer': { usd: 1 } },
						currentIcrcPrices: {},
						currentPolPrice: { 'polygon-ecosystem-token': { usd: 1 } },
						currentSolPrice: { solana: { usd: 1 } },
						currentSplPrices: {},
						currentArbitrumEthPrice: { ethereum: { usd: 1 } },
						currentBaseEthPrice: { ethereum: { usd: 1 } }
					}
				});
			});

			it('should not start the timer more than once', async () => {
				await onExchangeMessage(event);

				expect(postMessageMock).toHaveBeenCalledOnce();

				await onExchangeMessage(event);

				expect(postMessageMock).toHaveBeenCalledOnce();
			});

			it('should sync the latest payload when restarted during the immediate sync', async () => {
				let resolveFirstSync: ((v: CoingeckoSimpleErc4626TokenPriceResponse) => void) | undefined;
				vi.mocked(calculateErc4626Prices)
					.mockImplementationOnce(
						() =>
							new Promise((resolve) => {
								resolveFirstSync = resolve;
							})
					)
					.mockResolvedValue({});

				const firstEvent: MessageEvent<PostMessage<PostMessageDataRequestExchangeTimer>> = {
					...createEvent(msg),
					data: {
						msg,
						data: {
							currentCurrency: Currency.USD,
							erc20Addresses: [],
							icrcCanisterIds: [],
							splAddresses: [],
							erc4626TokensExchangeData: []
						}
					}
				};

				const latestEvent: MessageEvent<PostMessage<PostMessageDataRequestExchangeTimer>> = {
					...createEvent(msg),
					data: {
						msg,
						data: {
							currentCurrency: Currency.USD,
							erc20Addresses: [],
							icrcCanisterIds: ['icrc1'],
							splAddresses: [],
							erc4626TokensExchangeData: []
						}
					}
				};

				const firstStart = onExchangeMessage(firstEvent);
				await vi.advanceTimersByTimeAsync(0);

				expect(resolveFirstSync).toBeDefined();

				await onExchangeMessage(createEvent('stopExchangeTimer'));
				const latestStart = onExchangeMessage(latestEvent);

				resolveFirstSync?.({});

				await Promise.all([firstStart, latestStart]);

				await vi.waitFor(() => {
					expect(simpleTokenPrice).toHaveBeenCalledWith({
						id: 'internet-computer',
						vs_currencies: Currency.USD,
						contract_addresses: ['icrc1'],
						include_market_cap: true,
						include_24hr_change: true
					});
				});
			});

			it('should sync prices at the correct interval', async () => {
				await onExchangeMessage(event);

				expect(postMessageMock).toHaveBeenCalledOnce();

				await vi.advanceTimersByTimeAsync(SYNC_EXCHANGE_TIMER_INTERVAL * 10);

				expect(postMessageMock).toHaveBeenCalledTimes(11);
			});

			it('should post a sync success message even if some price fetches fail', async () => {
				const mockErrorMessage = 'Sync failed';
				const mockError = new Error(mockErrorMessage);
				vi.mocked(simplePrice).mockRejectedValueOnce(mockError);

				await onExchangeMessage(event);

				expect(postMessageMock).toHaveBeenCalledExactlyOnceWith({
					msg: 'syncExchange',
					data: expect.any(Object)
				});

				expect(console.error).toHaveBeenCalledExactlyOnceWith(
					'Error while fetching exchange rate:',
					mockError
				);
			});

			it('should not stop the timer if the sync fails', async () => {
				await onExchangeMessage(event);

				expect(postMessageMock).toHaveBeenCalledExactlyOnceWith({
					msg: 'syncExchange',
					data: expect.any(Object)
				});

				vi.clearAllMocks();

				const mockErrorMessage = 'Sync failed';
				const mockError = new Error(mockErrorMessage);
				vi.mocked(simplePrice).mockRejectedValueOnce(mockError);

				await vi.advanceTimersByTimeAsync(SYNC_EXCHANGE_TIMER_INTERVAL * 10);

				expect(postMessageMock).toHaveBeenCalledTimes(10);
			});

			it('should post syncExchangeError when all exchange calls throw', async () => {
				vi.mocked(simplePrice).mockRejectedValue(new Error('All failed'));
				vi.mocked(simpleTokenPrice).mockRejectedValue(new Error('All failed'));
				vi.mocked(calculateErc4626Prices).mockRejectedValue(new Error('All failed'));

				await onExchangeMessage(event);

				expect(postMessageMock).toHaveBeenCalledExactlyOnceWith({
					msg: 'syncExchangeError',
					data: { err: 'All failed' }
				});
			});

			it('should filter out unsupported coingecko platform IDs for ERC20 tokens', async () => {
				const unsupportedErc20Addresses: Erc20ContractAddressWithNetwork[] = [
					{ address: '0x123', coingeckoId: 'ethereum', chainId: 1n },
					// @ts-expect-error we test this on purpose
					{ address: '0xunknown', coingeckoId: 'unsupported-chain', chainId: 1n }
				];

				const mockEvent = {
					...event,
					data: {
						...event.data,
						msg,
						data: {
							currentCurrency: Currency.USD,
							erc20Addresses: unsupportedErc20Addresses,
							icrcCanisterIds: [],
							splAddresses: [],
							erc4626TokensExchangeData: []
						}
					}
				};

				await onExchangeMessage(mockEvent);

				expect(simpleTokenPrice).toHaveBeenCalledExactlyOnceWith({
					id: 'ethereum',
					vs_currencies: Currency.USD,
					contract_addresses: ['0x123'],
					include_market_cap: true,
					include_24hr_change: true
				});
			});

			it('should handle exchange rate rejection for non-USD currency', async () => {
				vi.mocked(simplePrice).mockRejectedValue(new Error('All prices failed'));

				const mockEvent = {
					...event,
					data: {
						...event.data,
						msg,
						data: {
							currentCurrency: Currency.JPY,
							erc20Addresses: [],
							icrcCanisterIds: [],
							splAddresses: [],
							erc4626TokensExchangeData: []
						}
					}
				};

				await onExchangeMessage(mockEvent);

				expect(postMessageMock).toHaveBeenCalledExactlyOnceWith({
					msg: 'syncExchange',
					data: {
						currentExchangeRate: {
							exchangeRateToUsd: null,
							exchangeRate24hChangeMultiplier: null,
							currency: Currency.JPY
						},
						currentEthPrice: undefined,
						currentBtcPrice: undefined,
						currentErc20Prices: {},
						currentErc4626Prices: {},
						currentIcpPrice: undefined,
						currentIcrcPrices: {},
						currentSolPrice: undefined,
						currentSplPrices: {},
						currentBnbPrice: undefined,
						currentPolPrice: undefined,
						currentArbitrumEthPrice: undefined,
						currentBaseEthPrice: undefined
					}
				});
			});

			it('should handle ETH, ICRC, and SPL price rejections individually', async () => {
				vi.mocked(simplePrice).mockImplementation(
					({ ids }: CoingeckoSimplePriceParams): Promise<CoingeckoSimplePriceResponse> => {
						const idList = Array.isArray(ids) ? ids : ids.split(',');
						if (idList.includes('ethereum')) {
							return Promise.reject(new Error('ETH failed'));
						}
						return Promise.resolve(idList.reduce((acc, id) => ({ ...acc, [id]: { usd: 1 } }), {}));
					}
				);

				vi.mocked(simpleTokenPrice).mockImplementation(
					({ id }: CoingeckoSimpleTokenPriceParams): Promise<CoingeckoSimpleTokenPriceResponse> => {
						if (id === 'internet-computer' || id === 'solana') {
							return Promise.reject(new Error(`${id} failed`));
						}
						return Promise.resolve({});
					}
				);

				const mockEvent = {
					...event,
					data: {
						...event.data,
						msg,
						data: {
							currentCurrency: Currency.USD,
							erc20Addresses: [],
							icrcCanisterIds: ['icrc1'],
							splAddresses: ['spl1'],
							erc4626TokensExchangeData: []
						}
					}
				};

				await onExchangeMessage(mockEvent);

				expect(postMessageMock).toHaveBeenCalledExactlyOnceWith({
					msg: 'syncExchange',
					data: {
						currentExchangeRate: {
							exchangeRateToUsd: 1,
							exchangeRate24hChangeMultiplier: 1,
							currency: Currency.USD
						},
						currentEthPrice: undefined,
						currentBtcPrice: { bitcoin: { usd: 1 } },
						currentErc20Prices: {},
						currentErc4626Prices: {},
						currentIcpPrice: { 'internet-computer': { usd: 1 } },
						currentIcrcPrices: {},
						currentSolPrice: { solana: { usd: 1 } },
						currentSplPrices: {},
						currentBnbPrice: { binancecoin: { usd: 1 } },
						currentPolPrice: { 'polygon-ecosystem-token': { usd: 1 } },
						currentArbitrumEthPrice: undefined,
						currentBaseEthPrice: undefined
					}
				});
			});

			it('should handle rejected ERC20 price promises gracefully', async () => {
				vi.mocked(simpleTokenPrice).mockRejectedValueOnce(new Error('ERC20 fetch failed'));

				const mockEvent: MessageEvent<PostMessage<PostMessageDataRequestExchangeTimer>> = {
					...event,
					data: {
						...event.data,
						msg,
						data: {
							currentCurrency: Currency.USD,
							erc20Addresses: [{ address: '0x123', coingeckoId: 'ethereum', chainId: 1n }],
							icrcCanisterIds: [],
							splAddresses: [],
							erc4626TokensExchangeData: []
						}
					}
				};

				await onExchangeMessage(mockEvent);

				expect(postMessageMock).toHaveBeenCalledExactlyOnceWith({
					msg: 'syncExchange',
					data: {
						currentExchangeRate: {
							exchangeRateToUsd: 1,
							exchangeRate24hChangeMultiplier: 1,
							currency: Currency.USD
						},
						currentEthPrice: { ethereum: { usd: 1 } },
						currentBtcPrice: { bitcoin: { usd: 1 } },
						currentErc20Prices: {},
						currentErc4626Prices: {},
						currentIcpPrice: { 'internet-computer': { usd: 1 } },
						currentIcrcPrices: {},
						currentSolPrice: { solana: { usd: 1 } },
						currentSplPrices: {},
						currentBnbPrice: { binancecoin: { usd: 1 } },
						currentPolPrice: { 'polygon-ecosystem-token': { usd: 1 } },
						currentArbitrumEthPrice: { ethereum: { usd: 1 } },
						currentBaseEthPrice: { ethereum: { usd: 1 } }
					}
				});
			});

			it('should handle empty payload', async () => {
				const mockEvent = { ...event, data: { ...event.data, msg, data: undefined } };

				await onExchangeMessage(mockEvent);

				expect(simpleTokenPrice).not.toHaveBeenCalled();
			});

			describe('when a payload is provided', () => {
				it('should sync prices for ERC20 tokens', async () => {
					const mockEvent = {
						...event,
						data: {
							...event.data,
							msg,
							data: {
								currentCurrency: Currency.JPY,
								erc20Addresses: mockErc20ContractAddresses,
								icrcCanisterIds: [],
								splAddresses: [],
								erc4626TokensExchangeData: []
							}
						}
					};

					await onExchangeMessage(mockEvent);

					expect(simpleTokenPrice).toHaveBeenCalledTimes(5);
					expect(simpleTokenPrice).toHaveBeenNthCalledWith(1, {
						id: 'ethereum',
						vs_currencies: Currency.USD,
						contract_addresses: ['0x123', '0xabc'],
						include_market_cap: true,
						include_24hr_change: true
					});
					expect(simpleTokenPrice).toHaveBeenNthCalledWith(2, {
						id: 'base',
						vs_currencies: Currency.USD,
						contract_addresses: ['0x456'],
						include_market_cap: true,
						include_24hr_change: true
					});
					expect(simpleTokenPrice).toHaveBeenNthCalledWith(3, {
						id: 'binance-smart-chain',
						vs_currencies: Currency.USD,
						contract_addresses: ['0x789'],
						include_market_cap: true,
						include_24hr_change: true
					});
					expect(simpleTokenPrice).toHaveBeenNthCalledWith(4, {
						id: 'polygon-pos',
						vs_currencies: Currency.USD,
						contract_addresses: ['0xdef'],
						include_market_cap: true,
						include_24hr_change: true
					});
					expect(simpleTokenPrice).toHaveBeenNthCalledWith(5, {
						id: 'arbitrum-one',
						vs_currencies: Currency.USD,
						contract_addresses: ['0xghi'],
						include_market_cap: true,
						include_24hr_change: true
					});
				});

				it('should sync prices for ICRC tokens', async () => {
					const mockEvent = {
						...event,
						data: {
							...event.data,
							msg,
							data: {
								currentCurrency: Currency.CHF,
								erc20Addresses: [],
								icrcCanisterIds: mockIcrcLedgerCanisterIds,
								splAddresses: [],
								erc4626TokensExchangeData: []
							}
						}
					};

					await onExchangeMessage(mockEvent);

					expect(simpleTokenPrice).toHaveBeenCalledExactlyOnceWith({
						id: 'internet-computer',
						vs_currencies: Currency.USD,
						contract_addresses: mockIcrcLedgerCanisterIds,
						include_market_cap: true,
						include_24hr_change: true
					});
				});

				it('should fallback on prices for ICRC tokens from Kong Swap', async () => {
					const updatedAt = '2024-01-01T00:00:00.000Z';

					vi.mocked(simpleTokenPrice).mockResolvedValueOnce({
						icrc1: { usd: 2, usd_market_cap: 1000, usd_24h_change: 0.5 }
					});

					vi.mocked(fetchBatchIcpSwapPrices).mockResolvedValueOnce([]);

					vi.mocked(fetchBatchKongSwapPrices).mockResolvedValueOnce([
						{
							token: {
								token_id: 1,
								name: 'Token 2',
								symbol: 'TKN2',
								canister_id: 'icrc2',
								address: null,
								decimals: 8,
								fee: 0,
								fee_fixed: null,
								has_custom_logo: false,
								icrc1: true,
								icrc2: false,
								icrc3: false,
								is_removed: false,
								logo_url: null,
								logo_updated_at: null,
								token_type: 'icrc1'
							},
							metrics: {
								token_id: 1,
								total_supply: null,
								market_cap: 500,
								price: 3,
								updated_at: updatedAt,
								volume_24h: 100,
								tvl: null,
								price_change_24h: 0.1,
								previous_price: null,
								is_verified: true
							}
						}
					]);

					const mockEvent = {
						...event,
						data: {
							...event.data,
							msg,
							data: {
								currentCurrency: Currency.CHF,
								erc20Addresses: [],
								icrcCanisterIds: mockIcrcLedgerCanisterIds,
								splAddresses: [],
								erc4626TokensExchangeData: []
							}
						}
					};

					await onExchangeMessage(mockEvent);

					expect(simpleTokenPrice).toHaveBeenCalledExactlyOnceWith({
						id: 'internet-computer',
						vs_currencies: Currency.USD,
						contract_addresses: mockIcrcLedgerCanisterIds,
						include_market_cap: true,
						include_24hr_change: true
					});

					expect(fetchBatchIcpSwapPrices).toHaveBeenCalledExactlyOnceWith(['icrc2']);
					expect(fetchBatchKongSwapPrices).toHaveBeenCalledExactlyOnceWith(['icrc2']);

					expect(postMessageMock).toHaveBeenCalledExactlyOnceWith({
						msg: 'syncExchange',
						data: expect.objectContaining({
							currentIcrcPrices: {
								icrc1: { usd: 2, usd_market_cap: 1000, usd_24h_change: 0.5 },
								icrc2: {
									usd: 3,
									usd_market_cap: 500,
									usd_24h_vol: 100,
									usd_24h_change: 0.1,
									last_updated_at: new Date(updatedAt).getTime()
								}
							}
						})
					});
				});

				it('should sync prices for SPL tokens', async () => {
					const mockEvent = {
						...event,
						data: {
							...event.data,
							msg,
							data: {
								currentCurrency: Currency.EUR,
								erc20Addresses: [],
								icrcCanisterIds: [],
								splAddresses: mockSplTokenAddresses,
								erc4626TokensExchangeData: []
							}
						}
					};

					await onExchangeMessage(mockEvent);

					expect(simpleTokenPrice).toHaveBeenCalledExactlyOnceWith({
						id: 'solana',
						vs_currencies: Currency.USD,
						contract_addresses: mockSplTokenAddresses,
						include_market_cap: true,
						include_24hr_change: true
					});
				});

				it('should sync prices for current currency', async () => {
					const mockEvent = {
						...event,
						data: {
							...event.data,
							msg,
							data: {
								currentCurrency: Currency.JPY,
								erc20Addresses: [],
								icrcCanisterIds: [],
								splAddresses: [],
								erc4626TokensExchangeData: []
							}
						}
					};

					await onExchangeMessage(mockEvent);

					// Native tokens + BTCUSD/BTCXXX
					expect(simplePrice).toHaveBeenCalledTimes(6 + 1);

					expect(simplePrice).toHaveBeenNthCalledWith(1, {
						ids: 'bitcoin',
						vs_currencies: `${Currency.USD},${Currency.JPY}`,
						include_24hr_change: true
					});
				});

				it('should not sync prices for current currency if it is USD', async () => {
					const mockEvent = {
						...event,
						data: {
							...event.data,
							msg,
							data: {
								currentCurrency: Currency.USD,
								erc20Addresses: [],
								icrcCanisterIds: [],
								splAddresses: [],
								erc4626TokensExchangeData: []
							}
						}
					};

					await onExchangeMessage(mockEvent);

					// Native tokens ONLY
					expect(simplePrice).toHaveBeenCalledTimes(6);
				});

				it('should sync prices for all tokens and for the current currency', async () => {
					const mockEvent = { ...event, data: { ...event.data, ...mockEventData, msg } };

					await onExchangeMessage(mockEvent);

					// ERC20 tokens + ICRC tokens + SPL tokens
					expect(simpleTokenPrice).toHaveBeenCalledTimes(5 + 1 + 1);

					expect(simpleTokenPrice).toHaveBeenNthCalledWith(1, {
						id: 'ethereum',
						vs_currencies: Currency.USD,
						contract_addresses: ['0x123', '0xabc'],
						include_market_cap: true,
						include_24hr_change: true
					});
					expect(simpleTokenPrice).toHaveBeenNthCalledWith(2, {
						id: 'base',
						vs_currencies: Currency.USD,
						contract_addresses: ['0x456'],
						include_market_cap: true,
						include_24hr_change: true
					});
					expect(simpleTokenPrice).toHaveBeenNthCalledWith(3, {
						id: 'binance-smart-chain',
						vs_currencies: Currency.USD,
						contract_addresses: ['0x789'],
						include_market_cap: true,
						include_24hr_change: true
					});
					expect(simpleTokenPrice).toHaveBeenNthCalledWith(4, {
						id: 'polygon-pos',
						vs_currencies: Currency.USD,
						contract_addresses: ['0xdef'],
						include_market_cap: true,
						include_24hr_change: true
					});
					expect(simpleTokenPrice).toHaveBeenNthCalledWith(5, {
						id: 'arbitrum-one',
						vs_currencies: Currency.USD,
						contract_addresses: ['0xghi'],
						include_market_cap: true,
						include_24hr_change: true
					});

					expect(simpleTokenPrice).toHaveBeenNthCalledWith(6, {
						id: 'internet-computer',
						vs_currencies: Currency.USD,
						contract_addresses: mockIcrcLedgerCanisterIds,
						include_market_cap: true,
						include_24hr_change: true
					});

					expect(simpleTokenPrice).toHaveBeenNthCalledWith(7, {
						id: 'solana',
						vs_currencies: Currency.USD,
						contract_addresses: mockSplTokenAddresses,
						include_market_cap: true,
						include_24hr_change: true
					});
				});

				it('should post a message with synced token prices', async () => {
					const mockEvent = { ...event, data: { ...event.data, ...mockEventData, msg } };

					await onExchangeMessage(mockEvent);

					expect(postMessageMock).toHaveBeenCalledExactlyOnceWith({
						msg: 'syncExchange',
						data: {
							currentExchangeRate: {
								exchangeRateToUsd: 1,
								exchangeRate24hChangeMultiplier: 1,
								currency: Currency.USD
							},
							currentBnbPrice: { binancecoin: { usd: 1 } },
							currentBtcPrice: { bitcoin: { usd: 1 } },
							currentErc20Prices: {
								'0x123': { usd: 1 },
								'0x456': { usd: 1 },
								'0x789': { usd: 1 },
								'0xabc': { usd: 1 },
								'0xdef': { usd: 1 },
								'0xghi': { usd: 1 }
							},
							currentErc4626Prices: {},
							currentEthPrice: { ethereum: { usd: 1 } },
							currentIcpPrice: { 'internet-computer': { usd: 1 } },
							currentIcrcPrices: { icrc1: { usd: 1 }, icrc2: { usd: 1 } },
							currentPolPrice: { 'polygon-ecosystem-token': { usd: 1 } },
							currentSolPrice: { solana: { usd: 1 } },
							currentSplPrices: { spl1: { usd: 1 }, spl2: { usd: 1 } },
							currentArbitrumEthPrice: { ethereum: { usd: 1 } },
							currentBaseEthPrice: { ethereum: { usd: 1 } }
						}
					});
				});

				it('should post a message with synced token prices and current currency exchange rate', async () => {
					vi.mocked(simplePrice).mockImplementation(
						({
							ids,
							vs_currencies
						}: CoingeckoSimplePriceParams): Promise<CoingeckoSimplePriceResponse> =>
							Promise.resolve(
								(Array.isArray(ids) ? ids : ids.split(',')).reduce(
									(acc, id) => ({
										...acc,
										[id]: {
											usd: 1,
											usd_24h_change: 3,
											...(vs_currencies.includes(',') ? { jpy: 3, jpy_24h_change: 5 } : {})
										}
									}),
									{}
								)
							)
					);

					const mockEvent = {
						...event,
						data: {
							...event.data,
							data: { ...mockEventData.data, currentCurrency: Currency.JPY },
							msg
						}
					};

					await onExchangeMessage(mockEvent);

					expect(postMessageMock).toHaveBeenCalledExactlyOnceWith({
						msg: 'syncExchange',
						data: {
							currentExchangeRate: {
								exchangeRateToUsd: 1 / 3,
								exchangeRate24hChangeMultiplier: 1.03 / 1.05,
								currency: Currency.JPY
							},
							currentBnbPrice: { binancecoin: { usd: 1, usd_24h_change: 3 } },
							currentBtcPrice: { bitcoin: { usd: 1, usd_24h_change: 3 } },
							currentErc20Prices: {
								'0x123': { usd: 1 },
								'0x456': { usd: 1 },
								'0x789': { usd: 1 },
								'0xabc': { usd: 1 },
								'0xdef': { usd: 1 },
								'0xghi': { usd: 1 }
							},
							currentErc4626Prices: {},
							currentEthPrice: { ethereum: { usd: 1, usd_24h_change: 3 } },
							currentIcpPrice: { 'internet-computer': { usd: 1, usd_24h_change: 3 } },
							currentIcrcPrices: { icrc1: { usd: 1 }, icrc2: { usd: 1 } },
							currentPolPrice: { 'polygon-ecosystem-token': { usd: 1, usd_24h_change: 3 } },
							currentSolPrice: { solana: { usd: 1, usd_24h_change: 3 } },
							currentSplPrices: { spl1: { usd: 1 }, spl2: { usd: 1 } },
							currentArbitrumEthPrice: { ethereum: { usd: 1, usd_24h_change: 3 } },
							currentBaseEthPrice: { ethereum: { usd: 1, usd_24h_change: 3 } }
						}
					});
				});
			});
		});

		describe('error handling in syncExchange', () => {
			const msg = 'startExchangeTimer' as const;

			it('should post syncExchangeError when an unexpected error occurs', async () => {
				vi.mocked(simplePrice).mockRejectedValue(new Error('catastrophic'));
				vi.mocked(simpleTokenPrice).mockRejectedValue(new Error('catastrophic'));
				vi.mocked(calculateErc4626Prices).mockRejectedValue(new Error('catastrophic'));

				const mockEvent: MessageEvent<PostMessage<PostMessageDataRequestExchangeTimer>> = {
					...createEvent(msg),
					data: {
						msg,
						data: {
							currentCurrency: Currency.USD,
							erc20Addresses: [],
							icrcCanisterIds: [],
							splAddresses: [],
							erc4626TokensExchangeData: []
						}
					}
				};

				await onExchangeMessage(mockEvent);

				expect(postMessageMock).toHaveBeenCalledExactlyOnceWith({
					msg: 'syncExchangeError',
					data: { err: 'catastrophic' }
				});
			});
		});

		describe('syncInProgress guard', () => {
			const msg = 'startExchangeTimer' as const;

			it('should skip sync when one is already in progress', async () => {
				const resolvers: Array<(value: CoingeckoSimplePriceResponse) => void> = [];
				vi.mocked(simplePrice).mockImplementation(
					() =>
						new Promise<CoingeckoSimplePriceResponse>((resolve) => {
							resolvers.push(resolve);
						})
				);

				const mockEvent: MessageEvent<PostMessage<PostMessageDataRequestExchangeTimer>> = {
					...createEvent(msg),
					data: {
						msg,
						data: {
							currentCurrency: Currency.USD,
							erc20Addresses: [],
							icrcCanisterIds: [],
							splAddresses: [],
							erc4626TokensExchangeData: []
						}
					}
				};

				const firstCall = onExchangeMessage(mockEvent);

				await vi.advanceTimersByTimeAsync(0);

				await onExchangeMessage(mockEvent);

				expect(postMessageMock).not.toHaveBeenCalled();

				resolvers.forEach((r) => r({ ethereum: { usd: 1 } }));
				await firstCall;
			});
		});

		describe('unknown coingecko platform', () => {
			const msg = 'startExchangeTimer' as const;

			it('should skip ERC20 addresses with unknown coingecko platform', async () => {
				const unknownPlatformAddress: Erc20ContractAddressWithNetwork = {
					address: '0xunknown',
					coingeckoId: 'unknown-platform' as Erc20ContractAddressWithNetwork['coingeckoId'],
					chainId: 1n
				};

				const mockEvent: MessageEvent<PostMessage<PostMessageDataRequestExchangeTimer>> = {
					...createEvent(msg),
					data: {
						msg,
						data: {
							currentCurrency: Currency.USD,
							erc20Addresses: [unknownPlatformAddress],
							icrcCanisterIds: [],
							splAddresses: [],
							erc4626TokensExchangeData: []
						}
					}
				};

				await onExchangeMessage(mockEvent);

				expect(simpleTokenPrice).not.toHaveBeenCalled();
			});
		});

		describe('with message stopExchangeTimer', () => {
			const startEvent = createEvent('startExchangeTimer');
			const stopEvent = createEvent('stopExchangeTimer');

			it('should stop the exchange syncing', async () => {
				await onExchangeMessage(startEvent);

				expect(postMessageMock).toHaveBeenCalledOnce();

				await onExchangeMessage(stopEvent);

				await vi.advanceTimersByTimeAsync(SYNC_EXCHANGE_TIMER_INTERVAL * 10);

				expect(postMessageMock).toHaveBeenCalledOnce();
			});

			it('should stop the timer and allow restarting it', async () => {
				await onExchangeMessage(startEvent);

				expect(postMessageMock).toHaveBeenCalledOnce();

				await onExchangeMessage(stopEvent);

				await vi.advanceTimersByTimeAsync(SYNC_EXCHANGE_TIMER_INTERVAL * 10);

				expect(postMessageMock).toHaveBeenCalledOnce();

				await onExchangeMessage(startEvent);

				expect(postMessageMock).toHaveBeenCalledTimes(2);
			});

			it('should not reschedule when timer is stopped during sync', async () => {
				await onExchangeMessage(startEvent);

				expect(postMessageMock).toHaveBeenCalledOnce();

				postMessageMock.mockClear();

				let resolveErc4626: ((v: CoingeckoSimpleErc4626TokenPriceResponse) => void) | undefined;
				vi.mocked(calculateErc4626Prices).mockImplementation(
					() =>
						new Promise((resolve) => {
							resolveErc4626 = resolve;
						})
				);

				await vi.advanceTimersByTimeAsync(SYNC_EXCHANGE_TIMER_INTERVAL);

				expect(resolveErc4626).toBeDefined();

				await onExchangeMessage(stopEvent);

				resolveErc4626?.({});
				await vi.advanceTimersByTimeAsync(0);

				expect(postMessageMock).toHaveBeenCalledOnce();

				postMessageMock.mockClear();
				await vi.advanceTimersByTimeAsync(SYNC_EXCHANGE_TIMER_INTERVAL * 5);

				expect(postMessageMock).not.toHaveBeenCalled();
			});
		});

		it.each(invalidMessages)(
			'should not call any scheduler method when message is %s',
			async (msg) => {
				const event = createEvent(msg);

				await onExchangeMessage(event);

				expect(postMessageMock).not.toHaveBeenCalled();

				expect(simplePrice).not.toHaveBeenCalled();
				expect(simpleTokenPrice).not.toHaveBeenCalled();
			}
		);

		describe('when BACKEND_EXCHANGE_ENABLED is true', () => {
			const msg = 'startExchangeTimer' as const;

			const mockExchangeRate: BackendExchangeRate = {
				usd: {
					price: 42000,
					price24hChangePct: 1.5,
					marketCap: 800_000_000_000,
					timestampNs: 1_000_000_000n
				}
			};

			const mockMyRates = (
				...entries: [TokenId, BackendExchangeRate | undefined][]
			): Array<[TokenId, BackendExchangeRate | undefined]> => entries;

			beforeEach(() => {
				backendExchangeEnabled.current = true;
			});

			afterEach(() => {
				backendExchangeEnabled.current = false;
			});

			it('should fetch prices from backend instead of CoinGecko', async () => {
				vi.mocked(getExchangeRates).mockResolvedValue([]);

				const mockEvent: MessageEvent<PostMessage<PostMessageDataRequestExchangeTimer>> = {
					...createEvent(msg),
					data: {
						msg,
						data: {
							currentCurrency: Currency.USD,
							erc20Addresses: [],
							icrcCanisterIds: [],
							splAddresses: [],
							erc4626TokensExchangeData: []
						}
					}
				};

				await onExchangeMessage(mockEvent);

				expect(getExchangeRates).toHaveBeenCalledOnce();
				expect(simpleTokenPrice).not.toHaveBeenCalled();
			});

			it('should post a message with backend exchange data', async () => {
				const erc20TokenId: TokenId = { Erc20: ['0xabc', 1n] };
				const icrcTokenId: TokenId = {
					Icrc: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai')
				};

				vi.mocked(getExchangeRates).mockResolvedValue(
					mockMyRates([erc20TokenId, mockExchangeRate], [icrcTokenId, mockExchangeRate])
				);

				const mockEvent: MessageEvent<PostMessage<PostMessageDataRequestExchangeTimer>> = {
					...createEvent(msg),
					data: {
						msg,
						data: {
							currentCurrency: Currency.USD,
							erc20Addresses: [{ address: '0xabc', coingeckoId: 'ethereum', chainId: 1n }],
							icrcCanisterIds: ['ryjl3-tyaaa-aaaaa-aaaba-cai'],
							splAddresses: [],
							erc4626TokensExchangeData: []
						}
					}
				};

				await onExchangeMessage(mockEvent);

				const expectedPrice = {
					usd: 42000,
					usd_24h_change: 1.5,
					usd_market_cap: 800_000_000_000,
					last_updated_at: 1000
				};

				expect(postMessageMock).toHaveBeenCalledExactlyOnceWith({
					msg: 'syncExchange',
					data: expect.objectContaining({
						currentExchangeRate: expect.objectContaining({
							exchangeRateToUsd: 1,
							currency: Currency.USD
						}),
						currentErc20Prices: { '0xabc': expectedPrice },
						currentIcrcPrices: { 'ryjl3-tyaaa-aaaaa-aaaba-cai': expectedPrice }
					})
				});
			});

			it('should include native token prices when backend provides them', async () => {
				vi.mocked(getExchangeRates).mockResolvedValue(
					mockMyRates(
						[{ EvmNative: 1n }, mockExchangeRate],
						[{ BtcNativeMainnet: null }, mockExchangeRate],
						[{ IcpNative: null }, mockExchangeRate],
						[{ SolNativeMainnet: null }, mockExchangeRate],
						[{ EvmNative: 56n }, mockExchangeRate],
						[{ EvmNative: 137n }, mockExchangeRate]
					)
				);

				const mockEvent: MessageEvent<PostMessage<PostMessageDataRequestExchangeTimer>> = {
					...createEvent(msg),
					data: {
						msg,
						data: {
							currentCurrency: Currency.USD,
							erc20Addresses: [],
							icrcCanisterIds: [],
							splAddresses: [],
							erc4626TokensExchangeData: []
						}
					}
				};

				await onExchangeMessage(mockEvent);

				const postedData = postMessageMock.mock.calls[0][0].data;
				const expectedPrice = {
					usd: 42000,
					usd_24h_change: 1.5,
					usd_market_cap: 800_000_000_000,
					last_updated_at: 1000
				};

				expect(postedData.currentEthPrice).toEqual({ ethereum: expectedPrice });
				expect(postedData.currentBtcPrice).toEqual({ bitcoin: expectedPrice });
				expect(postedData.currentIcpPrice).toEqual({ 'internet-computer': expectedPrice });
				expect(postedData.currentSolPrice).toEqual({ solana: expectedPrice });
				expect(postedData.currentBnbPrice).toEqual({ binancecoin: expectedPrice });
				expect(postedData.currentPolPrice).toEqual({
					'polygon-ecosystem-token': expectedPrice
				});
			});

			it('should still fetch currency exchange rate from CoinGecko for non-USD currencies', async () => {
				vi.mocked(getExchangeRates).mockResolvedValue([]);
				vi.mocked(simplePrice).mockResolvedValue({
					bitcoin: { usd: 60000, eur: 55000, usd_24h_change: 2, eur_24h_change: 1.5 }
				});

				const mockEvent: MessageEvent<PostMessage<PostMessageDataRequestExchangeTimer>> = {
					...createEvent(msg),
					data: {
						msg,
						data: {
							currentCurrency: Currency.EUR,
							erc20Addresses: [],
							icrcCanisterIds: [],
							splAddresses: [],
							erc4626TokensExchangeData: []
						}
					}
				};

				await onExchangeMessage(mockEvent);

				// The FX cross-rate call is still issued for the non-USD currency even though the
				// CoinGecko price fill is disabled by default in backend mode.
				expect(simplePrice).toHaveBeenCalledWith({
					ids: 'bitcoin',
					vs_currencies: `${Currency.USD},${Currency.EUR}`,
					include_24hr_change: true
				});

				expect(postMessageMock).toHaveBeenCalledExactlyOnceWith({
					msg: 'syncExchange',
					data: expect.objectContaining({
						currentExchangeRate: expect.objectContaining({
							currency: Currency.EUR,
							exchangeRateToUsd: 60000 / 55000
						})
					})
				});
			});

			it('should still post a sync success message when only the FX call fails', async () => {
				vi.mocked(simplePrice).mockRejectedValueOnce(new Error('Coingecko unavailable'));
				vi.mocked(getExchangeRates).mockResolvedValue(
					mockMyRates([{ EvmNative: 1n } as TokenId, mockExchangeRate])
				);
				vi.mocked(calculateErc4626Prices).mockResolvedValue({});

				const mockEvent: MessageEvent<PostMessage<PostMessageDataRequestExchangeTimer>> = {
					...createEvent(msg),
					data: {
						msg,
						data: {
							currentCurrency: Currency.EUR,
							erc20Addresses: [],
							icrcCanisterIds: [],
							splAddresses: [],
							erc4626TokensExchangeData: []
						}
					}
				};

				await onExchangeMessage(mockEvent);

				expect(postMessageMock).toHaveBeenCalledExactlyOnceWith({
					msg: 'syncExchange',
					data: expect.objectContaining({
						currentExchangeRate: {
							exchangeRateToUsd: null,
							exchangeRate24hChangeMultiplier: null,
							currency: Currency.EUR
						},
						currentEthPrice: {
							ethereum: {
								usd: 42000,
								usd_24h_change: 1.5,
								usd_market_cap: 800_000_000_000,
								last_updated_at: 1000
							}
						}
					})
				});
			});

			it('should still post a sync success message when only the backend call fails', async () => {
				vi.mocked(getExchangeRates).mockRejectedValue(new Error('Backend unavailable'));
				vi.mocked(calculateErc4626Prices).mockResolvedValue({});

				const mockEvent: MessageEvent<PostMessage<PostMessageDataRequestExchangeTimer>> = {
					...createEvent(msg),
					data: {
						msg,
						data: {
							currentCurrency: Currency.USD,
							erc20Addresses: [],
							icrcCanisterIds: [],
							splAddresses: [],
							erc4626TokensExchangeData: []
						}
					}
				};

				await onExchangeMessage(mockEvent);

				// The backend response is empty, but the CoinGecko fill is disabled by default,
				// so the natives stay unpriced (only the FX cross-rate is fetched).
				expect(postMessageMock).toHaveBeenCalledExactlyOnceWith({
					msg: 'syncExchange',
					data: {
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
					}
				});
			});

			it('should post syncExchangeError only when an unexpected error occurs', async () => {
				vi.mocked(getExchangeRates).mockResolvedValue([]);
				vi.mocked(calculateErc4626Prices).mockRejectedValue(new Error('Unexpected'));

				const mockEvent: MessageEvent<PostMessage<PostMessageDataRequestExchangeTimer>> = {
					...createEvent(msg),
					data: {
						msg,
						data: {
							currentCurrency: Currency.USD,
							erc20Addresses: [],
							icrcCanisterIds: [],
							splAddresses: [],
							erc4626TokensExchangeData: []
						}
					}
				};

				await onExchangeMessage(mockEvent);

				expect(postMessageMock).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						msg: 'syncExchangeError'
					})
				);
			});

			it('should post a sync success message and log error when identity is nullish', async () => {
				const provider = AuthClientProvider.getInstance();
				vi.mocked(provider.loadIdentity).mockResolvedValue(null as unknown as undefined);

				const mockEvent: MessageEvent<PostMessage<PostMessageDataRequestExchangeTimer>> = {
					...createEvent(msg),
					data: {
						msg,
						data: {
							currentCurrency: Currency.USD,
							erc20Addresses: [],
							icrcCanisterIds: [],
							splAddresses: [],
							erc4626TokensExchangeData: []
						}
					}
				};

				await onExchangeMessage(mockEvent);

				// No identity → the backend response is empty and the CoinGecko fill is disabled
				// by default, so everything stays unpriced and the FX rate stays null (the
				// identity error is logged).
				expect(postMessageMock).toHaveBeenCalledExactlyOnceWith({
					msg: 'syncExchange',
					data: {
						currentExchangeRate: {
							exchangeRateToUsd: null,
							exchangeRate24hChangeMultiplier: null,
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
						currentPolPrice: undefined
					}
				});

				expect(console.error).toHaveBeenCalledExactlyOnceWith(
					'Error while fetching exchange rate:',
					'Cannot fetch backend exchange rates without an authenticated identity.'
				);

				expect(getExchangeRates).not.toHaveBeenCalled();
			});

			describe('frontend provider fallback', () => {
				const allNativesBackendRates = (): Array<[TokenId, BackendExchangeRate | undefined]> =>
					mockMyRates(
						[{ EvmNative: 1n }, mockExchangeRate],
						[{ BtcNativeMainnet: null }, mockExchangeRate],
						[{ IcpNative: null }, mockExchangeRate],
						[{ SolNativeMainnet: null }, mockExchangeRate],
						[{ EvmNative: 56n }, mockExchangeRate],
						[{ EvmNative: 137n }, mockExchangeRate],
						[{ EvmNative: 42161n }, mockExchangeRate],
						[{ EvmNative: 8453n }, mockExchangeRate]
					);

				it('should not call any provider when the backend priced everything', async () => {
					vi.mocked(getExchangeRates).mockResolvedValue(
						mockMyRates(
							...allNativesBackendRates(),
							[{ Erc20: ['0xabc', 1n] }, mockExchangeRate],
							[{ Icrc: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai') }, mockExchangeRate]
						)
					);

					const mockEvent: MessageEvent<PostMessage<PostMessageDataRequestExchangeTimer>> = {
						...createEvent(msg),
						data: {
							msg,
							data: {
								currentCurrency: Currency.USD,
								erc20Addresses: [{ address: '0xabc', coingeckoId: 'ethereum', chainId: 1n }],
								icrcCanisterIds: ['ryjl3-tyaaa-aaaaa-aaaba-cai'],
								splAddresses: [],
								erc4626TokensExchangeData: []
							}
						}
					};

					await onExchangeMessage(mockEvent);

					expect(simpleTokenPrice).not.toHaveBeenCalled();
					expect(simplePrice).not.toHaveBeenCalled();
					expect(fetchBatchIcpSwapPrices).not.toHaveBeenCalled();
				});

				it('should not call CoinGecko for missing natives, ERC-20 and SPL tokens by default', async () => {
					// Backend prices nothing → everything missing, but the CoinGecko-only fills
					// are disabled by default, so the tokens simply stay unpriced.
					vi.mocked(getExchangeRates).mockResolvedValue([]);

					const mockEvent: MessageEvent<PostMessage<PostMessageDataRequestExchangeTimer>> = {
						...createEvent(msg),
						data: {
							msg,
							data: {
								currentCurrency: Currency.USD,
								erc20Addresses: [{ address: '0xmissing', coingeckoId: 'ethereum', chainId: 1n }],
								icrcCanisterIds: [],
								splAddresses: ['spl1'],
								erc4626TokensExchangeData: []
							}
						}
					};

					await onExchangeMessage(mockEvent);

					expect(simplePrice).not.toHaveBeenCalled();
					expect(simpleTokenPrice).not.toHaveBeenCalled();
					expect(fetchBatchIcpSwapPrices).not.toHaveBeenCalled();

					const postedData = postMessageMock.mock.calls[0][0].data;

					expect(postedData.currentEthPrice).toBeUndefined();
					expect(postedData.currentBtcPrice).toBeUndefined();
					expect(postedData.currentErc20Prices).toEqual({});
					expect(postedData.currentSplPrices).toEqual({});
				});

				it('should fill missing ICRC prices via the ICPSwap/Kong cascade only by default', async () => {
					// Backend prices all natives but none of the requested ICRC tokens.
					vi.mocked(getExchangeRates).mockResolvedValue(mockMyRates(...allNativesBackendRates()));

					vi.mocked(fetchBatchIcpSwapPrices).mockResolvedValue([
						createMockIcpSwapToken({ tokenLedgerId: 'icrc1' })
					]);
					vi.mocked(fetchBatchKongSwapPrices).mockResolvedValue([]);

					const mockEvent: MessageEvent<PostMessage<PostMessageDataRequestExchangeTimer>> = {
						...createEvent(msg),
						data: {
							msg,
							data: {
								currentCurrency: Currency.USD,
								erc20Addresses: [],
								icrcCanisterIds: ['icrc1', 'icrc2'],
								splAddresses: [],
								erc4626TokensExchangeData: []
							}
						}
					};

					await onExchangeMessage(mockEvent);

					// The ICRC fill never starts from CoinGecko.
					expect(simplePrice).not.toHaveBeenCalled();
					expect(simpleTokenPrice).not.toHaveBeenCalled();

					expect(fetchBatchIcpSwapPrices).toHaveBeenCalledExactlyOnceWith(['icrc1', 'icrc2']);
					expect(fetchBatchKongSwapPrices).toHaveBeenCalledExactlyOnceWith(['icrc2']);

					const postedData = postMessageMock.mock.calls[0][0].data;

					expect(postedData.currentIcrcPrices.icrc1).toEqual({
						usd: 1.23,
						usd_market_cap: 0,
						usd_24h_vol: 50000,
						usd_24h_change: 2.5
					});
					expect(postedData.currentIcrcPrices.icrc2).toBeUndefined();
				});

				describe('when the CoinGecko fallback provider is enabled', () => {
					beforeEach(() => {
						coingeckoFallbackEnabled.current = true;
					});

					afterEach(() => {
						coingeckoFallbackEnabled.current = false;
					});

					it('should fill only the tokens the backend left unpriced', async () => {
						// Backend prices everything except one ERC-20, one ICRC and one SPL token.
						vi.mocked(getExchangeRates).mockResolvedValue(
							mockMyRates(...allNativesBackendRates(), [
								{ Erc20: ['0xpriced', 1n] },
								mockExchangeRate
							])
						);

						const mockEvent: MessageEvent<PostMessage<PostMessageDataRequestExchangeTimer>> = {
							...createEvent(msg),
							data: {
								msg,
								data: {
									currentCurrency: Currency.USD,
									erc20Addresses: [
										{ address: '0xpriced', coingeckoId: 'ethereum', chainId: 1n },
										{ address: '0xmissing', coingeckoId: 'ethereum', chainId: 1n }
									],
									icrcCanisterIds: ['icrc1'],
									splAddresses: ['spl1'],
									erc4626TokensExchangeData: []
								}
							}
						};

						await onExchangeMessage(mockEvent);

						// No native CoinGecko calls — backend priced all natives.
						expect(simplePrice).not.toHaveBeenCalled();

						// Only the missing ERC-20 (0xmissing), missing ICRC (icrc1) and missing SPL (spl1).
						expect(simpleTokenPrice).toHaveBeenCalledWith({
							id: 'ethereum',
							vs_currencies: Currency.USD,
							contract_addresses: ['0xmissing'],
							include_market_cap: true,
							include_24hr_change: true
						});
						expect(simpleTokenPrice).toHaveBeenCalledWith({
							id: 'internet-computer',
							vs_currencies: Currency.USD,
							contract_addresses: ['icrc1'],
							include_market_cap: true,
							include_24hr_change: true
						});
						expect(simpleTokenPrice).toHaveBeenCalledWith({
							id: 'solana',
							vs_currencies: Currency.USD,
							contract_addresses: ['spl1'],
							include_market_cap: true,
							include_24hr_change: true
						});

						const postedData = postMessageMock.mock.calls[0][0].data;

						// Backend keeps its priced ERC-20, provider fills the missing one.
						expect(postedData.currentErc20Prices['0xpriced']).toBeDefined();
						expect(postedData.currentErc20Prices['0xmissing']).toEqual({ usd: 1 });
						expect(postedData.currentIcrcPrices.icrc1).toEqual({ usd: 1 });
						expect(postedData.currentSplPrices.spl1).toEqual({ usd: 1 });
					});

					it('should fill missing native prices from the providers via a single shared ETH call', async () => {
						// Backend prices nothing → all natives missing.
						vi.mocked(getExchangeRates).mockResolvedValue([]);

						const mockEvent: MessageEvent<PostMessage<PostMessageDataRequestExchangeTimer>> = {
							...createEvent(msg),
							data: {
								msg,
								data: {
									currentCurrency: Currency.USD,
									erc20Addresses: [],
									icrcCanisterIds: [],
									splAddresses: [],
									erc4626TokensExchangeData: []
								}
							}
						};

						await onExchangeMessage(mockEvent);

						// ETH, BTC, ICP, SOL, BNB, POL — ETH covers Arbitrum + Base too (no duplicate).
						expect(simplePrice).toHaveBeenCalledTimes(6);
						expect(simplePrice).toHaveBeenCalledWith({
							ids: 'ethereum',
							vs_currencies: Currency.USD,
							include_24hr_change: true
						});

						const postedData = postMessageMock.mock.calls[0][0].data;

						expect(postedData.currentEthPrice).toEqual({ ethereum: { usd: 1 } });
						expect(postedData.currentArbitrumEthPrice).toEqual({ ethereum: { usd: 1 } });
						expect(postedData.currentBaseEthPrice).toEqual({ ethereum: { usd: 1 } });
						expect(postedData.currentBtcPrice).toEqual({ bitcoin: { usd: 1 } });
					});

					it('should recompute erc4626 prices from the merged erc20 prices', async () => {
						vi.mocked(getExchangeRates).mockResolvedValue(
							mockMyRates(...allNativesBackendRates(), [
								{ Erc20: ['0xpriced', 1n] },
								mockExchangeRate
							])
						);
						vi.mocked(calculateErc4626Prices).mockResolvedValue({});

						const mockEvent: MessageEvent<PostMessage<PostMessageDataRequestExchangeTimer>> = {
							...createEvent(msg),
							data: {
								msg,
								data: {
									currentCurrency: Currency.USD,
									erc20Addresses: [
										{ address: '0xpriced', coingeckoId: 'ethereum', chainId: 1n },
										{ address: '0xmissing', coingeckoId: 'ethereum', chainId: 1n }
									],
									icrcCanisterIds: [],
									splAddresses: [],
									erc4626TokensExchangeData: []
								}
							}
						};

						await onExchangeMessage(mockEvent);

						const erc4626Call = vi.mocked(calculateErc4626Prices).mock.calls.at(-1)?.[0];

						expect(Object.keys(erc4626Call?.erc20Prices ?? {})).toEqual(
							expect.arrayContaining(['0xpriced', '0xmissing'])
						);
					});

					it('should fill native prices from the providers when the backend has no data for them', async () => {
						vi.mocked(getExchangeRates).mockResolvedValue([]);

						const mockEvent: MessageEvent<PostMessage<PostMessageDataRequestExchangeTimer>> = {
							...createEvent(msg),
							data: {
								msg,
								data: {
									currentCurrency: Currency.USD,
									erc20Addresses: [],
									icrcCanisterIds: [],
									splAddresses: [],
									erc4626TokensExchangeData: []
								}
							}
						};

						await onExchangeMessage(mockEvent);

						const postedData = postMessageMock.mock.calls[0][0].data;

						expect(postedData.currentEthPrice).toEqual({ ethereum: { usd: 1 } });
						expect(postedData.currentBtcPrice).toEqual({ bitcoin: { usd: 1 } });
						expect(postedData.currentIcpPrice).toEqual({ 'internet-computer': { usd: 1 } });
						expect(postedData.currentSolPrice).toEqual({ solana: { usd: 1 } });
						expect(postedData.currentBnbPrice).toEqual({ binancecoin: { usd: 1 } });
						expect(postedData.currentPolPrice).toEqual({ 'polygon-ecosystem-token': { usd: 1 } });
						expect(postedData.currentArbitrumEthPrice).toEqual({ ethereum: { usd: 1 } });
						expect(postedData.currentBaseEthPrice).toEqual({ ethereum: { usd: 1 } });
					});
				});
			});
		});
	});
});
