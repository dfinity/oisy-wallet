import { BtcWalletScheduler } from '$btc/schedulers/btc-wallet.scheduler';
import { mapBtcTransaction } from '$btc/utils/btc-transactions.utils';
import * as backendApi from '$lib/api/backend.api';
import { SignerCanister } from '$lib/canisters/signer.canister';
import { WALLET_TIMER_INTERVAL_MILLIS, ZERO } from '$lib/constants/app.constants';
import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import * as blockchainRest from '$lib/rest/blockchain.rest';
import * as blockstreamRest from '$lib/rest/blockstream.rest';
import type { PostMessageDataRequestBtc } from '$lib/types/post-message';
import { mockBtcTransaction } from '$tests/mocks/blockchain-transactions.mock';
import { mockBlockchainResponse } from '$tests/mocks/blockchain.mock';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { TestUtil } from '$tests/types/utils';
import { jsonReplacer } from '@dfinity/utils';
import { BitcoinCanister, type BitcoinNetwork } from '@icp-sdk/canisters/ckbtc';
import { waitFor } from '@testing-library/svelte';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

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

vi.mock(import('$lib/services/query.services'), async (importOriginal) => {
	const actual = await importOriginal();

	return {
		...actual,
		createQueryAndUpdateWithWarmup: () =>
			actual.createQueryAndUpdateWithWarmup({ warmupMs: 0, defaultStrategy: 'query_and_update' })
	};
});

describe('btc-wallet.worker', () => {
	let spyGetCertifiedBalance: MockInstance;
	let spyGetUncertifiedBalance: MockInstance;

	const signerCanisterMock = mock<SignerCanister>();
	const bitcoinCanisterMock = mock<BitcoinCanister>();

	let originalPostmessage: unknown;

	const mockBalance = 100n;

	const latestBitcoinBlockHeight = 100;

	const mockPostMessageStatusInProgress = {
		msg: 'syncBtcWalletStatus',
		data: {
			state: 'in_progress'
		}
	};

	const mockPostMessageStatusIdle = {
		msg: 'syncBtcWalletStatus',
		data: {
			state: 'idle'
		}
	};

	const mockPostMessage = ({
		certified,
		withTransactions,
		ref
	}: {
		certified: boolean;
		withTransactions: boolean;
		ref: string;
	}) => ({
		ref,
		msg: 'syncBtcWallet',
		data: {
			wallet: {
				balance: {
					certified,
					data: {
						confirmed: mockBalance,
						unconfirmed: ZERO,
						locked: ZERO,
						total: mockBalance
					}
				},
				newTransactions: JSON.stringify(
					withTransactions
						? [
								{
									data: mapBtcTransaction({
										transaction: mockBtcTransaction,
										latestBitcoinBlockHeight,
										btcAddress: mockBtcAddress
									}),
									// TODO: use "certified" instead of hardcoded value when we have a way of certifying BTC txs
									certified: false
								}
							]
						: [],
					jsonReplacer
				)
			}
		}
	});

	const postMessageMock = vi.fn();

	// We don't await the job execution promise in the scheduler's function, so we need to advance the timers to verify the correct execution of the job
	const awaitJobExecution = () => vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS - 100);

	beforeAll(() => {
		originalPostmessage = window.postMessage;
		window.postMessage = postMessageMock;
	});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		const provider = AuthClientProvider.getInstance();
		vi.mocked(provider.loadIdentity).mockResolvedValue(mockIdentity);

		const mockBlockHeight = 1000;
		vi.spyOn(blockstreamRest, 'btcLatestBlockHeight').mockResolvedValue(mockBlockHeight);

		vi.spyOn(blockchainRest, 'btcAddressData').mockResolvedValue(mockBlockchainResponse);

		vi.spyOn(SignerCanister, 'create').mockResolvedValue(signerCanisterMock);
		vi.spyOn(BitcoinCanister, 'create').mockReturnValue(bitcoinCanisterMock);

		spyGetUncertifiedBalance = bitcoinCanisterMock.getBalanceQuery.mockResolvedValue(mockBalance);
		spyGetCertifiedBalance = signerCanisterMock.getBtcBalance.mockImplementation(async () => {
			await waitFor(() => Promise.resolve(), { timeout: 1000 });
			return mockBalance;
		});

		vi.spyOn(backendApi, 'getPendingBtcTransactions').mockResolvedValue({ response: [] });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	afterAll(() => {
		// @ts-expect-error redo original
		window.postMessage = originalPostmessage;
	});

	const testWorker = ({
		startData = undefined
	}: {
		startData?: PostMessageDataRequestBtc | undefined;
	}): TestUtil => {
		const scheduler: BtcWalletScheduler = new BtcWalletScheduler();

		const ref = startData?.btcAddress.data ?? '';

		const mockPostMessageUncertified = mockPostMessage({
			certified: false,
			withTransactions: true,
			ref
		});
		const mockPostMessageCertified = mockPostMessage({
			certified: true,
			withTransactions: false,
			ref
		});

		return {
			setup: () => {},

			teardown: () => {
				// Reset the internal store with transactions
				scheduler['store'] = {
					transactions: {},
					balance: undefined,
					latestBitcoinBlockHeight: undefined
				};

				scheduler.stop();
			},

			tests: () => {
				it('should trigger postMessage with correct data', async () => {
					await scheduler.start(startData);

					await awaitJobExecution();

					expect(postMessageMock).toHaveBeenCalledTimes(4);
					// The uncertified/certified payloads may interleave between
					// the in_progress and idle brackets depending on microtask
					// timing, so assert membership and bracketing rather than
					// strict ordering of the two data messages.
					expect(postMessageMock).toHaveBeenNthCalledWith(1, mockPostMessageStatusInProgress);
					expect(postMessageMock).toHaveBeenNthCalledWith(4, mockPostMessageStatusIdle);
					expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageUncertified);
					expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageCertified);

					await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

					expect(postMessageMock).toHaveBeenCalledTimes(6);
					expect(postMessageMock).toHaveBeenNthCalledWith(5, mockPostMessageStatusInProgress);
					expect(postMessageMock).toHaveBeenNthCalledWith(6, mockPostMessageStatusIdle);

					await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

					expect(postMessageMock).toHaveBeenCalledTimes(8);
					expect(postMessageMock).toHaveBeenNthCalledWith(7, mockPostMessageStatusInProgress);
					expect(postMessageMock).toHaveBeenNthCalledWith(8, mockPostMessageStatusIdle);
				});

				it('should start the scheduler with an interval', async () => {
					await scheduler.start(startData);

					expect(scheduler['timer']['timer']).toBeDefined();
				});

				it('should trigger the scheduler manually', async () => {
					await scheduler.trigger(startData);

					expect(spyGetUncertifiedBalance).toHaveBeenCalledOnce();
					expect(spyGetCertifiedBalance).toHaveBeenCalledOnce();
				});

				it('should stop the scheduler', () => {
					scheduler.stop();

					expect(scheduler['timer']['timer']).toBeUndefined();
				});

				it('should trigger syncWallet periodically', async () => {
					await scheduler.start(startData);

					// Wait for the first execution to complete
					await awaitJobExecution();

					expect(spyGetUncertifiedBalance).toHaveBeenCalledOnce();
					expect(spyGetCertifiedBalance).toHaveBeenCalledOnce();

					await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

					expect(spyGetUncertifiedBalance).toHaveBeenCalledTimes(2);
					expect(spyGetCertifiedBalance).toHaveBeenCalledTimes(2);

					await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

					expect(spyGetUncertifiedBalance).toHaveBeenCalledTimes(3);
					expect(spyGetCertifiedBalance).toHaveBeenCalledTimes(3);
				});

				it('should postMessage with status of the worker', async () => {
					await scheduler.start(startData);

					await awaitJobExecution();

					expect(postMessageMock).toHaveBeenCalledTimes(4);
					expect(postMessageMock).toHaveBeenNthCalledWith(1, mockPostMessageStatusInProgress);
					expect(postMessageMock).toHaveBeenNthCalledWith(4, mockPostMessageStatusIdle);
					expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageUncertified);
					expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageCertified);
				});

				it('should trigger postMessage with error on third try', async () => {
					const err = new Error('test');
					signerCanisterMock.getBtcBalance.mockRejectedValue(err);

					await scheduler.start(startData);
					await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);
					await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

					// idle and in_progress 3 times
					// error
					expect(postMessageMock).toHaveBeenCalledTimes(7);

					expect(postMessageMock).toHaveBeenCalledWith({
						ref,
						msg: 'syncBtcWalletError',
						data: {
							error: err
						}
					});
				});

				it('should reset the internal store when emitting an error so the next successful sync re-emits', async () => {
					await scheduler.start(startData);

					await awaitJobExecution();

					// Sanity check: the first sync populated the internal store.
					expect(scheduler['store'].balance).toBeDefined();

					// Force three consecutive update failures to cross the FAILURE_THRESHOLD.
					const err = new Error('Failed to fetch');
					signerCanisterMock.getBtcBalance.mockRejectedValue(err);

					await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);
					await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);
					await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

					expect(postMessageMock).toHaveBeenCalledWith({
						ref,
						msg: 'syncBtcWalletError',
						data: {
							error: err
						}
					});

					// After the fatal error, the in-memory store must be cleared so the next tick
					// behaves like an initial sync (mirroring the listener-side UI reset).
					expect(scheduler['store']).toEqual({
						balance: undefined,
						transactions: {},
						latestBitcoinBlockHeight: undefined
					});
				});
			}
		};
	};

	describe('btc-wallet worker should work', () => {
		const startData = {
			btcAddress: {
				certified: true,
				data: mockBtcAddress
			},
			shouldFetchTransactions: true,
			bitcoinNetwork: 'mainnet' as BitcoinNetwork,
			minterCanisterId: 'mqygn-kiaaa-aaaar-qaadq-cai'
		};

		const { setup, teardown, tests } = testWorker({ startData });

		beforeEach(setup);

		afterEach(teardown);

		tests();
	});
});
