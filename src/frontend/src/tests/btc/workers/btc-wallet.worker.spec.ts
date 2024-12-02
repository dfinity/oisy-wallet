import { BtcWalletScheduler } from '$btc/schedulers/btc-wallet.scheduler';
import { mapBtcTransaction } from '$btc/utils/btc-transactions.utils';
import * as agent from '$lib/actors/agents.ic';
import { SignerCanister } from '$lib/canisters/signer.canister';
import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import * as blockchainRest from '$lib/rest/blockchain.rest';
import * as blockstreamRest from '$lib/rest/blockstream.rest';
import type { PostMessageDataRequestBtc } from '$lib/types/post-message';
import * as authUtils from '$lib/utils/auth.utils';
import { mockBtcTransaction } from '$tests/mocks/btc-transactions.mock';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { HttpAgent } from '@dfinity/agent';
import { jsonReplacer } from '@dfinity/utils';
import { beforeAll, type MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

describe('btc-wallet.worker', () => {
	let spyGetBalance: MockInstance;

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

	beforeAll(() => {
		originalPostmessage = window.postMessage;
		window.postMessage = postMessageMock;
	});

	afterAll(() => {
		// @ts-expect-error redo original
		window.postMessage = originalPostmessage;
	});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		vi.spyOn(authUtils, 'loadIdentity').mockResolvedValue(mockIdentity);

		vi.spyOn(agent, 'getAgent').mockResolvedValue(mock<HttpAgent>());

		vi.spyOn(blockstreamRest, 'btcLatestBlockHeight').mockResolvedValue(1000);

		vi.spyOn(blockchainRest, 'btcAddressData').mockResolvedValue({
			txs: [mockBtcTransaction],
			address: mockBtcAddress,
			final_balance: 100,
			total_received: 100,
			hash160: 'hash160',
			n_tx: 100,
			n_unredeemed: 100,
			total_sent: 100
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	const testWorker = ({
		startData = undefined
	}: {
		startData?: PostMessageDataRequestBtc | undefined;
	}) => {
		let scheduler: BtcWalletScheduler = new BtcWalletScheduler();

		const mockPostMessageCertifiedWithTransactions = mockPostMessage({
			certified: true,
			withTransactions: startData?.shouldFetchTransactions ?? false
		});
		const mockPostMessageCertifiedWithoutTransactions = mockPostMessage({
			certified: true,
			withTransactions: false
		});

		afterEach(() => {
			scheduler.stop();
		});

		it('should start the scheduler with an interval', async () => {
			await scheduler.start(startData);

			expect(scheduler['timer']['timer']).toBeDefined();
		});

		it('should trigger the scheduler manually', async () => {
			await scheduler.trigger(startData);

			// update call only = 1
			expect(spyGetBalance).toHaveBeenCalledTimes(1);
		});

		it('should stop the scheduler', () => {
			scheduler.stop();
			expect(scheduler['timer']['timer']).toBeUndefined();
		});

		// TODO: update this test after "queryAndUpdate" approach is introduced in the following PR
		it('should trigger syncWallet periodically', async () => {
			await scheduler.start(startData);

			expect(spyGetBalance).toHaveBeenCalledTimes(1);

			await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

			expect(spyGetBalance).toHaveBeenCalledTimes(2);

			await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

			expect(spyGetBalance).toHaveBeenCalledTimes(3);
		});

		// TODO: right now, postMessage is triggered even on changes (it is fixed in the following PR and the test will be updated accordingly)
		it('should trigger postMessage with correct data', async () => {
			// create a new wallet instance to reset internal store with transactions
			scheduler = new BtcWalletScheduler();

			await scheduler.start(startData);

			expect(postMessageMock).toHaveBeenCalledTimes(3);
			expect(postMessageMock).toHaveBeenNthCalledWith(1, mockPostMessageStatusInProgress);
			expect(postMessageMock).toHaveBeenNthCalledWith(2, mockPostMessageCertifiedWithTransactions);
			expect(postMessageMock).toHaveBeenNthCalledWith(3, mockPostMessageStatusIdle);

			await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

			expect(postMessageMock).toHaveBeenCalledTimes(6);
			expect(postMessageMock).toHaveBeenNthCalledWith(4, mockPostMessageStatusInProgress);
			// mocked transaction is already cached at this point so the next postMessage should not have it
			expect(postMessageMock).toHaveBeenNthCalledWith(
				5,
				mockPostMessageCertifiedWithoutTransactions
			);
			expect(postMessageMock).toHaveBeenNthCalledWith(6, mockPostMessageStatusIdle);

			await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

			expect(postMessageMock).toHaveBeenCalledTimes(9);
			expect(postMessageMock).toHaveBeenNthCalledWith(7, mockPostMessageStatusInProgress);
			// mocked transaction is already cached at this point so the next postMessage should not have it
			expect(postMessageMock).toHaveBeenNthCalledWith(
				8,
				mockPostMessageCertifiedWithoutTransactions
			);
			expect(postMessageMock).toHaveBeenNthCalledWith(9, mockPostMessageStatusIdle);
		});

		it('should postMessage with status of the worker', async () => {
			await scheduler.start(startData);

			expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusInProgress);
			expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusIdle);
		});
	};

	describe('btc-wallet worker should work', () => {
		const signerCanisterMock = mock<SignerCanister>();

		const startData = {
			btcAddress: {
				certified: true,
				data: mockBtcAddress
			},
			bitcoinNetwork: { mainnet: null }
		};

		beforeEach(() => {
			vi.spyOn(SignerCanister, 'create').mockResolvedValue(signerCanisterMock);

			spyGetBalance = signerCanisterMock.getBtcBalance.mockResolvedValue(mockBalance);
		});

		describe('with balance only', () => {
			testWorker({
				startData: {
					...startData,
					shouldFetchTransactions: false
				}
			});
		});

		describe('with balance and transactions', () => {
			testWorker({
				startData: {
					...startData,
					shouldFetchTransactions: true
				}
			});
		});
	});
});
