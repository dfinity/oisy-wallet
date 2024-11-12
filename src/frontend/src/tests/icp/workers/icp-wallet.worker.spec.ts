import { IcWalletScheduler } from '$icp/schedulers/ic-wallet.scheduler';
import { mapIcpTransaction } from '$icp/utils/icp-transactions.utils';
import { initIcpWalletScheduler } from '$icp/workers/icp-wallet.worker';
import * as agent from '$lib/actors/agents.ic';
import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import type { PostMessageDataRequest } from '$lib/types/post-message';
import * as authUtils from '$lib/utils/auth.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { HttpAgent } from '@dfinity/agent';
import { IndexCanister, type Transaction, type TransactionWithId } from '@dfinity/ledger-icp';
import { jsonReplacer } from '@dfinity/utils';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

describe('icp-wallet.worker', () => {
	let scheduler: IcWalletScheduler<Transaction, TransactionWithId, PostMessageDataRequest>;
	const indexCanisterMock = mock<IndexCanister>();

	let spyGetTransactions: MockInstance;

	let originalPostmessage: unknown;

	const mockBalance = 100n;
	const mockOldestTxId = 4n;
	const mockTransaction: TransactionWithId = {
		id: 123n,
		transaction: {
			memo: 0n,
			icrc1_memo: [],
			operation: {
				Transfer: {
					to: 'abc',
					fee: { e8s: 456n },
					from: 'cde',
					amount: { e8s: 789n },
					spender: []
				}
			},
			timestamp: [],
			created_at_time: []
		}
	};

	const mockPostMessageStatusInProgress = {
		msg: 'syncIcWalletStatus',
		data: {
			state: 'in_progress'
		}
	};

	const mockPostMessageStatusIdle = {
		msg: 'syncIcWalletStatus',
		data: {
			state: 'idle'
		}
	};

	const mockMappedTransaction = mapIcpTransaction({
		transaction: mockTransaction,
		identity: mockIdentity
	});

	const mockPostMessageData = (certified: boolean) => ({
		wallet: {
			balance: {
				certified,
				data: mockBalance
			},
			oldest_tx_id: [mockOldestTxId],
			newTransactions: JSON.stringify(
				[
					{
						data: mockMappedTransaction,
						certified
					}
				],
				jsonReplacer
			)
		}
	});

	const mockPostMessageNotCertified = {
		msg: 'syncIcpWallet',
		data: mockPostMessageData(false)
	};

	const mockPostMessageCertified = {
		msg: 'syncIcpWallet',
		data: mockPostMessageData(true)
	};

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

		scheduler = initIcpWalletScheduler();

		vi.spyOn(authUtils, 'loadIdentity').mockResolvedValue(mockIdentity);

		vi.spyOn(IndexCanister, 'create').mockImplementation(() => indexCanisterMock);
		vi.spyOn(agent, 'getAgent').mockResolvedValue(mock<HttpAgent>());

		spyGetTransactions = indexCanisterMock.getTransactions.mockResolvedValue({
			balance: mockBalance,
			transactions: [mockTransaction],
			oldest_tx_id: [mockOldestTxId]
		});
	});

	afterEach(() => {
		scheduler.stop();

		vi.useRealTimers();
	});

	it('should start the scheduler with an interval', async () => {
		await scheduler.start(undefined);
		expect(scheduler['timer']['timer']).toBeDefined();
	});

	it('should trigger the scheduler manually', async () => {
		await scheduler.trigger(undefined);

		// query + update = 2
		expect(spyGetTransactions).toHaveBeenCalledTimes(2);
	});

	it('should stop the scheduler', () => {
		scheduler.stop();
		expect(scheduler['timer']['timer']).toBeUndefined();
	});

	it('should trigger syncWallet periodically', async () => {
		await scheduler.start(undefined);

		// query + update = 2
		expect(spyGetTransactions).toHaveBeenCalledTimes(2);

		await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

		expect(spyGetTransactions).toHaveBeenCalledTimes(4);

		await vi.advanceTimersByTimeAsync(WALLET_TIMER_INTERVAL_MILLIS);

		expect(spyGetTransactions).toHaveBeenCalledTimes(6);
	});

	it('should no trigger postMessage if no changes', async () => {
		await scheduler.start(undefined);

		// query + update = 2
		expect(postMessageMock).toHaveBeenCalledTimes(4);

		expect(postMessageMock).toHaveBeenNthCalledWith(1, mockPostMessageStatusInProgress);
		expect(postMessageMock).toHaveBeenNthCalledWith(2, mockPostMessageNotCertified);
		expect(postMessageMock).toHaveBeenNthCalledWith(3, mockPostMessageCertified);
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

	it('should postMessage with status of the worker', async () => {
		await scheduler.start(undefined);

		expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusInProgress);

		expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageStatusIdle);
	});

	it('should postMessage with balance and transactions', async () => {
		await scheduler.start(undefined);

		expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageNotCertified);

		expect(postMessageMock).toHaveBeenCalledWith(mockPostMessageCertified);
	});
});
