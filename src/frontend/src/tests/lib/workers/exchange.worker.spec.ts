import { calculateErc4626Prices } from '$eth/services/erc4626-exchange.services';
import type { Erc20ContractAddressWithNetwork } from '$icp-eth/types/icrc-erc20';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import { SYNC_EXCHANGE_TIMER_INTERVAL } from '$lib/constants/exchange.constants';
import { Currency } from '$lib/enums/currency';
import { simplePrice, simpleTokenPrice } from '$lib/rest/coingecko.rest';
import type {
	CoingeckoSimplePriceParams,
	CoingeckoSimplePriceResponse,
	CoingeckoSimpleTokenPriceParams,
	CoingeckoSimpleTokenPriceResponse
} from '$lib/types/coingecko';
import type { PostMessage, PostMessageDataRequestExchangeTimer } from '$lib/types/post-message';
import { onExchangeMessage } from '$lib/workers/exchange.worker';
import type { SplTokenAddress } from '$sol/types/spl';
import { createMockEvent, excludeValidMessageEvents } from '$tests/mocks/workers.mock';

vi.mock('$lib/rest/coingecko.rest', () => ({
	simplePrice: vi.fn(),
	simpleTokenPrice: vi.fn()
}));

vi.mock('$eth/services/erc4626-exchange.services', () => ({
	calculateErc4626Prices: vi.fn()
}));

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
				{ address: '0x123', coingeckoId: 'ethereum' },
				{ address: '0x456', coingeckoId: 'base' },
				{ address: '0x789', coingeckoId: 'binance-smart-chain' },
				{ address: '0xabc', coingeckoId: 'ethereum' },
				{ address: '0xdef', coingeckoId: 'polygon-pos' },
				{ address: '0xghi', coingeckoId: 'arbitrum-one' }
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
						currentIcrcPrices: null,
						currentPolPrice: { 'polygon-ecosystem-token': { usd: 1 } },
						currentSolPrice: { solana: { usd: 1 } },
						currentSplPrices: null
					}
				});
			});

			it('should not start the timer more than once', async () => {
				await onExchangeMessage(event);

				expect(postMessageMock).toHaveBeenCalledOnce();

				await onExchangeMessage(event);

				expect(postMessageMock).toHaveBeenCalledOnce();
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
					{ address: '0x123', coingeckoId: 'ethereum' },
					// @ts-expect-error we test this on purpose
					{ address: '0xunknown', coingeckoId: 'unsupported-chain' }
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
					data: expect.objectContaining({
						currentExchangeRate: expect.objectContaining({
							exchangeRateToUsd: undefined,
							currency: Currency.JPY
						})
					})
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
					data: expect.objectContaining({
						currentEthPrice: undefined,
						currentIcrcPrices: undefined,
						currentSplPrices: undefined
					})
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
							erc20Addresses: [{ address: '0x123', coingeckoId: 'ethereum' }],
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
						currentErc20Prices: {}
					})
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

				it.todo('should fallback on prices for ICRC tokens from Kong Swap', async () => {});

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
							currentSplPrices: { spl1: { usd: 1 }, spl2: { usd: 1 } }
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
							currentSplPrices: { spl1: { usd: 1 }, spl2: { usd: 1 } }
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

				expect(postMessageMock).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						msg: 'syncExchangeError'
					})
				);
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
					coingeckoId: 'unknown-platform' as Erc20ContractAddressWithNetwork['coingeckoId']
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

				let resolveErc4626: ((v: CoingeckoSimpleTokenPriceResponse) => void) | undefined;
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
	});
});
