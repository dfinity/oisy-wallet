import { BtcWalletScheduler } from '$btc/schedulers/btc-wallet.scheduler';
import { mapBtcTransaction } from '$btc/utils/btc-transactions.utils';
import { SignerCanister } from '$lib/canisters/signer.canister';
import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import * as blockchainRest from '$lib/rest/blockchain.rest';
import * as blockstreamRest from '$lib/rest/blockstream.rest';
import type { PostMessageDataRequestBtc } from '$lib/types/post-message';
import * as authUtils from '$lib/utils/auth.utils';
import { mockBlockchainResponse } from '$tests/mocks/blockchain.mock';
import { mockBtcTransaction } from '$tests/mocks/btc-transactions.mock';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { TestUtil } from '$tests/types/utils';
import { BitcoinCanister, type BitcoinNetwork } from '@dfinity/ckbtc';
import { jsonReplacer } from '@dfinity/utils';
import { waitFor } from '@testing-library/svelte';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

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
		withTransactions
	}: {
		certified: boolean;
		withTransactions: boolean;
	}) => ({
		msg: 'syncBtcWallet',
		data: {
			wallet: {
				balance: {
					certified,
					data: mockBalance
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

		vi.spyOn(authUtils, 'loadIdentity').mockResolvedValue(mockIdentity);

		let mockBlockHeight = 1000;
		vi.spyOn(blockstreamRest, 'btcLatestBlockHeight').mockResolvedValue(mockBlockHeight++);

		vi.spyOn(blockchainRest, 'btcAddressData').mockResolvedValue(mockBlockchainResponse);

		vi.spyOn(SignerCanister, 'create').mockResolvedValue(signerCanisterMock);
		vi.spyOn(BitcoinCanister, 'create').mockReturnValue(bitcoinCanisterMock);

		spyGetUncertifiedBalance = bitcoinCanisterMock.getBalanceQuery.mockResolvedValue(mockBalance);
		spyGetCertifiedBalance = signerCanisterMock.getBtcBalance.mockImplementation(async () => {
			await waitFor(() => Promise.resolve(), { timeout: 1000 });
			return mockBalance;
		});
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

		const mockPostMessageUncertified = mockPostMessage({
			certified: false,
			withTransactions: true
		});
		const mockPostMessageCertified = mockPostMessage({
			certified: true,
			withTransactions: false
		});

		return {
			setup: () => {},

			teardown: () => {
				// reset internal store with transactions
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
					expect(postMessageMock).toHaveBeenNthCalledWith(1, mockPostMessageStatusInProgress);
					expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageUncertified);
					expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageCertified);
					expect(postMessageMock).toHaveBeenNthCalledWith(4, mockPostMessageStatusIdle);

					await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

					expect(postMessageMock).toHaveBeenCalledTimes(6);
					expect(postMessageMock).toHaveBeenNthCalledWith(5, mockPostMessageStatusInProgress);
					expect(postMessageMock).toHaveBeenNthCalledWith(6, mockPostMessageCertified);
					expect(postMessageMock).toHaveBeenNthCalledWith(7, mockPostMessageStatusIdle);

					await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

					expect(postMessageMock).toHaveBeenCalledTimes(10);
					expect(postMessageMock).toHaveBeenNthCalledWith(8, mockPostMessageStatusInProgress);
					expect(postMessageMock).toHaveBeenNthCalledWith(9, mockPostMessageUncertified);
					expect(postMessageMock).toHaveBeenNthCalledWith(10, mockPostMessageStatusIdle);
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

					expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusInProgress);
					expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusIdle);
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
						msg: 'syncBtcWalletError',
						data: {
							error: err
						}
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
