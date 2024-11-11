import { IcWalletScheduler } from '$icp/schedulers/ic-wallet.scheduler';
import * as agent from '$lib/actors/agents.ic';
import type { PostMessageDataRequestIcrc } from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import * as authUtils from '$lib/utils/auth.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { HttpAgent } from '@dfinity/agent';
import type { IcrcTransaction, IcrcTransactionWithId } from '@dfinity/ledger-icrc';
import type { GetTransactions } from '@dfinity/ledger-icrc/dist/candid/icrc_index-ng';
import { mock } from 'vitest-mock-extended';

process.env.VITEST_ENV = 'node';

describe('IcWalletScheduler', () => {
	let scheduler: IcWalletScheduler<
		IcrcTransaction,
		IcrcTransactionWithId,
		PostMessageDataRequestIcrc
	>;

	const mockTransactions = [{ id: 'tx1', transaction: { data: 'mockData', certified: true } }];
	const mockBalance: CertifiedData<bigint> = { data: BigInt(1000), certified: true };

	const mockGetTransactions = vi.fn().mockImplementation(() =>
		Promise.resolve({
			balance: 100n,
			transactions: [],
			oldest_tx_id: [0n]
		} as GetTransactions)
	);

	const mockMapToSelfTransaction = vi.fn();
	const mockMapTransaction = vi.fn();

	const postMessageMock = vi.fn();

	let originalPostMessage: unknown;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();

		scheduler = new IcWalletScheduler(
			mockGetTransactions,
			mockMapToSelfTransaction,
			mockMapTransaction,
			'syncIcpWallet'
		);

		originalPostMessage = postMessage;
		globalThis.postMessage = postMessageMock;

		vi.spyOn(authUtils, 'loadIdentity').mockResolvedValue(mockIdentity);

		vi.spyOn(agent, 'getAgent').mockResolvedValue(mock<HttpAgent>());
	});

	afterEach(() => {
		scheduler.stop();

		// @ts-expect-error mocked for test
		globalThis.postMessage = originalPostMessage;

		vi.useRealTimers();
	});

	it('should start the scheduler with an interval', async () => {
		await scheduler.start(undefined);
		expect(scheduler['timer']['timer']).toBeDefined();
	});

	it.skip('should trigger the scheduler manually', async () => {
		await scheduler.trigger(undefined);
		expect(scheduler['timer']['timer']).toBeDefined();
	});

	it('should stop the scheduler', () => {
		scheduler.stop();
		expect(scheduler['timer']['timer']).toBeUndefined();
	});

	it('should trigger syncWallet periodically', async () => {
		await scheduler.start(undefined);

		// Fast-forward time to trigger the scheduled job multiple times
		// vi.advanceTimersByTime(WALLET_TIMER_INTERVAL_MILLIS * 3);

		expect(mockGetTransactions).toHaveBeenCalledTimes(3);
	});
});
