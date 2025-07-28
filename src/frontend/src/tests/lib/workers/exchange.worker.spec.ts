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
					splAddresses: mockSplTokenAddresses
				}
			};

			it('should sync prices for native tokens', async () => {
				await onExchangeMessage(event);

				expect(simplePrice).toHaveBeenCalledTimes(6);
				expect(simplePrice).toHaveBeenNthCalledWith(1, {
					ids: 'ethereum',
					vs_currencies: Currency.USD
				});
				expect(simplePrice).toHaveBeenNthCalledWith(2, {
					ids: 'bitcoin',
					vs_currencies: Currency.USD
				});
				expect(simplePrice).toHaveBeenNthCalledWith(3, {
					ids: 'internet-computer',
					vs_currencies: Currency.USD
				});
				expect(simplePrice).toHaveBeenNthCalledWith(4, {
					ids: 'solana',
					vs_currencies: Currency.USD
				});
				expect(simplePrice).toHaveBeenNthCalledWith(5, {
					ids: 'binancecoin',
					vs_currencies: Currency.USD
				});
				expect(simplePrice).toHaveBeenNthCalledWith(6, {
					ids: 'polygon-ecosystem-token',
					vs_currencies: Currency.USD
				});
			});

			it('should post a message with synced prices', async () => {
				await onExchangeMessage(event);

				expect(postMessageMock).toHaveBeenCalledOnce();
				expect(postMessageMock).toHaveBeenNthCalledWith(1, {
					msg: 'syncExchange',
					data: {
						currentExchangeRate: {
							exchangeRateToUsd: 1,
							currency: Currency.USD
						},
						currentBnbPrice: { binancecoin: { usd: 1 } },
						currentBtcPrice: { bitcoin: { usd: 1 } },
						currentErc20Prices: {},
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

			it('should post an error message if the sync fails', async () => {
				const mockErrorMessage = 'Sync failed';
				const mockError = new Error(mockErrorMessage);
				vi.mocked(simplePrice).mockRejectedValueOnce(mockError);

				await onExchangeMessage(event);

				expect(postMessageMock).toHaveBeenCalledOnce();
				expect(postMessageMock).toHaveBeenNthCalledWith(1, {
					msg: 'syncExchangeError',
					data: { err: mockErrorMessage }
				});

				expect(console.error).toHaveBeenCalledOnce();
				expect(console.error).toHaveBeenNthCalledWith(
					1,
					'Unexpected error while fetching symbol average price:',
					mockError
				);
			});

			it('should stop the timer if the sync fails', async () => {
				await onExchangeMessage(event);

				expect(postMessageMock).toHaveBeenCalledOnce();

				vi.clearAllMocks();

				const mockErrorMessage = 'Sync failed';
				const mockError = new Error(mockErrorMessage);
				vi.mocked(simplePrice).mockRejectedValueOnce(mockError);

				await vi.advanceTimersByTimeAsync(SYNC_EXCHANGE_TIMER_INTERVAL * 10);

				expect(postMessageMock).not.toHaveBeenCalledWith({
					msg: 'syncExchange',
					data: expect.any(Object)
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
								splAddresses: []
							}
						}
					};

					await onExchangeMessage(mockEvent);

					expect(simpleTokenPrice).toHaveBeenCalledTimes(5);
					expect(simpleTokenPrice).toHaveBeenNthCalledWith(1, {
						id: 'ethereum',
						vs_currencies: Currency.USD,
						contract_addresses: ['0x123', '0xabc'],
						include_market_cap: true
					});
					expect(simpleTokenPrice).toHaveBeenNthCalledWith(2, {
						id: 'base',
						vs_currencies: Currency.USD,
						contract_addresses: ['0x456'],
						include_market_cap: true
					});
					expect(simpleTokenPrice).toHaveBeenNthCalledWith(3, {
						id: 'binance-smart-chain',
						vs_currencies: Currency.USD,
						contract_addresses: ['0x789'],
						include_market_cap: true
					});
					expect(simpleTokenPrice).toHaveBeenNthCalledWith(4, {
						id: 'polygon-pos',
						vs_currencies: Currency.USD,
						contract_addresses: ['0xdef'],
						include_market_cap: true
					});
					expect(simpleTokenPrice).toHaveBeenNthCalledWith(5, {
						id: 'arbitrum-one',
						vs_currencies: Currency.USD,
						contract_addresses: ['0xghi'],
						include_market_cap: true
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
								splAddresses: []
							}
						}
					};

					await onExchangeMessage(mockEvent);

					expect(simpleTokenPrice).toHaveBeenCalledOnce();
					expect(simpleTokenPrice).toHaveBeenNthCalledWith(1, {
						id: 'internet-computer',
						vs_currencies: Currency.USD,
						contract_addresses: mockIcrcLedgerCanisterIds,
						include_market_cap: true
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
								splAddresses: mockSplTokenAddresses
							}
						}
					};

					await onExchangeMessage(mockEvent);

					expect(simpleTokenPrice).toHaveBeenCalledOnce();
					expect(simpleTokenPrice).toHaveBeenNthCalledWith(1, {
						id: 'solana',
						vs_currencies: Currency.USD,
						contract_addresses: mockSplTokenAddresses,
						include_market_cap: true
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
								splAddresses: []
							}
						}
					};

					await onExchangeMessage(mockEvent);

					// Native tokens + BTCUSD/BTCXXX
					expect(simplePrice).toHaveBeenCalledTimes(6 + 1);

					expect(simplePrice).toHaveBeenNthCalledWith(1, {
						ids: 'bitcoin',
						vs_currencies: `${Currency.USD},${Currency.JPY}`
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
								splAddresses: []
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
						include_market_cap: true
					});
					expect(simpleTokenPrice).toHaveBeenNthCalledWith(2, {
						id: 'base',
						vs_currencies: Currency.USD,
						contract_addresses: ['0x456'],
						include_market_cap: true
					});
					expect(simpleTokenPrice).toHaveBeenNthCalledWith(3, {
						id: 'binance-smart-chain',
						vs_currencies: Currency.USD,
						contract_addresses: ['0x789'],
						include_market_cap: true
					});
					expect(simpleTokenPrice).toHaveBeenNthCalledWith(4, {
						id: 'polygon-pos',
						vs_currencies: Currency.USD,
						contract_addresses: ['0xdef'],
						include_market_cap: true
					});
					expect(simpleTokenPrice).toHaveBeenNthCalledWith(5, {
						id: 'arbitrum-one',
						vs_currencies: Currency.USD,
						contract_addresses: ['0xghi'],
						include_market_cap: true
					});

					expect(simpleTokenPrice).toHaveBeenNthCalledWith(6, {
						id: 'internet-computer',
						vs_currencies: Currency.USD,
						contract_addresses: mockIcrcLedgerCanisterIds,
						include_market_cap: true
					});

					expect(simpleTokenPrice).toHaveBeenNthCalledWith(7, {
						id: 'solana',
						vs_currencies: Currency.USD,
						contract_addresses: mockSplTokenAddresses,
						include_market_cap: true
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
										[id]: { usd: 1, ...(vs_currencies.includes(',') ? { jpy: 3 } : {}) }
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
								currency: Currency.JPY
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
							currentEthPrice: { ethereum: { usd: 1 } },
							currentIcpPrice: { 'internet-computer': { usd: 1 } },
							currentIcrcPrices: { icrc1: { usd: 1 }, icrc2: { usd: 1 } },
							currentPolPrice: { 'polygon-ecosystem-token': { usd: 1 } },
							currentSolPrice: { solana: { usd: 1 } },
							currentSplPrices: { spl1: { usd: 1 }, spl2: { usd: 1 } }
						}
					});
				});
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
