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

	const testWorker = ({
		startData = undefined
	}: {
		startData?: PostMessageDataRequestBtc | undefined;
	}) => {
		const scheduler: BtcWalletScheduler = new BtcWalletScheduler();

		const mockPostMessageUncertified = mockPostMessage({
			certified: false,
			withTransactions: true
		});
		const mockPostMessageCertified = mockPostMessage({
			certified: true,
			withTransactions: false
		});

		afterEach(() => {
			// reset internal store with transactions
			scheduler['store'] = {
				transactions: {},
				balance: undefined
			};

			scheduler.stop();
		});

		it('should trigger postMessage with correct data', async () => {
			await scheduler.start(startData);

			expect(postMessageMock).toHaveBeenCalledTimes(4);
			expect(postMessageMock).toHaveBeenNthCalledWith(1, mockPostMessageStatusInProgress);
			expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageUncertified);
			expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageCertified);
			expect(postMessageMock).toHaveBeenNthCalledWith(4, mockPostMessageStatusIdle);

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

			expect(spyGetUncertifiedBalance).toHaveBeenCalledTimes(1);
			expect(spyGetCertifiedBalance).toHaveBeenCalledTimes(1);
		});

		it('should stop the scheduler', () => {
			scheduler.stop();
			expect(scheduler['timer']['timer']).toBeUndefined();
		});

		it('should trigger syncWallet periodically', async () => {
			await scheduler.start(startData);

			expect(spyGetUncertifiedBalance).toHaveBeenCalledTimes(1);
			expect(spyGetCertifiedBalance).toHaveBeenCalledTimes(1);

			await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

			expect(spyGetUncertifiedBalance).toHaveBeenCalledTimes(2);
			expect(spyGetCertifiedBalance).toHaveBeenCalledTimes(2);

			await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

			expect(spyGetUncertifiedBalance).toHaveBeenCalledTimes(3);
			expect(spyGetCertifiedBalance).toHaveBeenCalledTimes(3);
		});

		it('should postMessage with status of the worker', async () => {
			await scheduler.start(startData);

			expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusInProgress);
			expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusIdle);
		});

		it('should trigger postMessage with error', async () => {
			const err = new Error('test');
			signerCanisterMock.getBtcBalance.mockRejectedValue(err);

			await scheduler.start(startData);

			// idle and in_progress
			// error
			expect(postMessageMock).toHaveBeenCalledTimes(3);

			expect(postMessageMock).toHaveBeenCalledWith({
				msg: 'syncBtcWalletError',
				data: {
					error: err
				}
			});
		});
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

		testWorker({ startData });
	});
});
