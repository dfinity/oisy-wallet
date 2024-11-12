import { IcWalletScheduler } from '$icp/schedulers/ic-wallet.scheduler';
import { initIcpWalletScheduler } from '$icp/workers/icp-wallet.worker';
import * as agent from '$lib/actors/agents.ic';
import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import type { PostMessageDataRequest } from '$lib/types/post-message';
import * as authUtils from '$lib/utils/auth.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { HttpAgent } from '@dfinity/agent';
import { IndexCanister, type Transaction, type TransactionWithId } from '@dfinity/ledger-icp';
import type { MockInstance } from 'vitest';
import { mock } from 'vitest-mock-extended';

describe('icp-wallet.worker', () => {
	let scheduler: IcWalletScheduler<Transaction, TransactionWithId, PostMessageDataRequest>;
	const indexCanisterMock = mock<IndexCanister>();

	let spyGetTransactions: MockInstance;

	let originalPostmessage: unknown;

	beforeAll(() => {
		originalPostmessage = window.postMessage;
		window.postMessage = (_message: unknown) => {
			// Do nothing
		};
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
			balance: 100n,
			transactions: [],
			oldest_tx_id: [0n]
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
});
