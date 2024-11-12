import { IcWalletScheduler } from '$icp/schedulers/ic-wallet.scheduler';
import * as agent from '$lib/actors/agents.ic';
import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import type { PostMessageDataRequestIcrc } from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import * as authUtils from '$lib/utils/auth.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { HttpAgent } from '@dfinity/agent';
import type { IcrcTransaction, IcrcTransactionWithId } from '@dfinity/ledger-icrc';
import type { GetTransactions } from '@dfinity/ledger-icrc/dist/candid/icrc_index-ng';
import { mock } from 'vitest-mock-extended';

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
		vi.useFakeTimers();
		vi.clearAllMocks();

		scheduler = new IcWalletScheduler(
			mockGetTransactions,
			mockMapToSelfTransaction,
			mockMapTransaction,
			'syncIcpWallet'
		);

		vi.spyOn(authUtils, 'loadIdentity').mockResolvedValue(mockIdentity);

		vi.spyOn(agent, 'getAgent').mockResolvedValue(mock<HttpAgent>());
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
		expect(mockGetTransactions).toHaveBeenCalledTimes(2);
	});

	it('should stop the scheduler', () => {
		scheduler.stop();
		expect(scheduler['timer']['timer']).toBeUndefined();
	});

	it('should trigger syncWallet periodically', async () => {
		await scheduler.start(undefined);

		vi.advanceTimersByTime(WALLET_TIMER_INTERVAL_MILLIS);

		expect(mockGetTransactions).toHaveBeenCalledTimes(4);
	});
});
