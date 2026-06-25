import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import * as liquidiumApi from '$lib/api/liquidium.api';
import { ZERO } from '$lib/constants/app.constants';
import * as activeUserTransactionsServices from '$lib/services/active-user-transactions.services';
import { pollLiquidiumActiveUserTransactions } from '$lib/services/liquidium-active-tx.services';
import { LIQUIDIUM_EXTERNAL_REF_KEYS } from '$lib/types/liquidium-active-tx';
import { mockIdentity } from '$tests/mocks/identity.mock';
import {
	ActivityDirection,
	ActivityKind,
	ActivityStatus,
	type Activity,
	type InflowActivity
} from '@liquidium/client';

vi.mock('$lib/api/liquidium.api', () => ({ liquidiumClient: vi.fn() }));
vi.mock('$lib/services/active-user-transactions.services', () => ({
	applyActiveUserTransactionPollUpdate: vi.fn()
}));

describe('liquidium-active-tx.services', () => {
	const profileId = 'profile-1';
	const poolId = 'pool-btc';
	const txid = '0xabc123';

	const list = vi.fn();
	const apply = vi.mocked(activeUserTransactionsServices.applyActiveUserTransactionPollUpdate);

	const buildTx = (refs: Record<string, string>): ActiveUserTransaction => ({
		id: 'tx-1',
		status: { Pending: null },
		external_refs: Object.entries(refs).map(([key, value]) => ({ key, value })),
		progress_step: [],
		data: {
			Liquidium: {
				token: { SolNativeDevnet: null },
				action: { Supply: null },
				pool_id: poolId,
				amount: 100n
			}
		},
		updated_at_ns: ZERO,
		error: [],
		created_at_ns: ZERO
	});

	const buildActivity = (overrides: Partial<InflowActivity> = {}): Activity => ({
		id: 'act-1',
		poolId,
		asset: 'BTC',
		chain: 'BTC',
		amount: 100n,
		timestampMs: 0,
		txid,
		confirmations: null,
		requiredConfirmations: null,
		direction: ActivityDirection.inflow,
		kind: ActivityKind.deposit,
		status: ActivityStatus.pending,
		...overrides
	});

	const poll = (tx: ActiveUserTransaction) =>
		pollLiquidiumActiveUserTransactions({ identity: mockIdentity, transactions: [tx] });

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(liquidiumApi.liquidiumClient).mockReturnValue({
			activities: { list }
		} as unknown as ReturnType<typeof liquidiumApi.liquidiumClient>);
	});

	it('does nothing without a profile id', async () => {
		await poll(buildTx({ [LIQUIDIUM_EXTERNAL_REF_KEYS.TXID]: txid }));

		expect(apply).not.toHaveBeenCalled();
		expect(list).not.toHaveBeenCalled();
	});

	it('does nothing without a txid', async () => {
		await poll(buildTx({ [LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID]: profileId }));

		expect(apply).not.toHaveBeenCalled();
		expect(list).not.toHaveBeenCalled();
	});

	it('terminalizes from the txid-matched activity', async () => {
		list.mockResolvedValue([buildActivity({ status: ActivityStatus.confirmed })]);

		await poll(
			buildTx({
				[LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID]: profileId,
				[LIQUIDIUM_EXTERNAL_REF_KEYS.TXID]: txid
			})
		);

		const [[{ update }]] = apply.mock.calls;

		expect(update?.status).toEqual({ Succeeded: null });
	});

	it('surfaces an error from a failed activity', async () => {
		list.mockResolvedValue([buildActivity({ status: ActivityStatus.failed })]);

		await poll(
			buildTx({
				[LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID]: profileId,
				[LIQUIDIUM_EXTERNAL_REF_KEYS.TXID]: txid
			})
		);

		const [[{ update }]] = apply.mock.calls;

		expect(update?.status).toEqual({ Failed: null });
		expect(update?.error).toBeTruthy();
	});

	it('advances an in-flight activity to Executing', async () => {
		list.mockResolvedValue([buildActivity({ status: ActivityStatus.detected })]);

		await poll(
			buildTx({
				[LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID]: profileId,
				[LIQUIDIUM_EXTERNAL_REF_KEYS.TXID]: txid
			})
		);

		const [[{ update }]] = apply.mock.calls;

		expect(update?.status).toEqual({ Executing: null });
	});

	it('does not advance for a non-progressing status', async () => {
		list.mockResolvedValue([buildActivity({ status: ActivityStatus.requested })]);

		await poll(
			buildTx({
				[LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID]: profileId,
				[LIQUIDIUM_EXTERNAL_REF_KEYS.TXID]: txid
			})
		);

		expect(apply).not.toHaveBeenCalled();
	});

	it('does nothing when no activity matches the txid', async () => {
		list.mockResolvedValue([buildActivity({ txid: '0xother', status: ActivityStatus.confirmed })]);

		await poll(
			buildTx({
				[LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID]: profileId,
				[LIQUIDIUM_EXTERNAL_REF_KEYS.TXID]: txid
			})
		);

		expect(apply).not.toHaveBeenCalled();
	});

	it('matches txid ignoring case and a 0x prefix mismatch', async () => {
		// Stored ref carries `0x` + uppercase; the SDK activity carries neither.
		list.mockResolvedValue([buildActivity({ txid: 'abc123', status: ActivityStatus.confirmed })]);

		await poll(
			buildTx({
				[LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID]: profileId,
				[LIQUIDIUM_EXTERNAL_REF_KEYS.TXID]: '0xABC123'
			})
		);

		const [[{ update }]] = apply.mock.calls;

		expect(update?.status).toEqual({ Succeeded: null });
	});

	it('matches against the activity txids array', async () => {
		list.mockResolvedValue([
			buildActivity({ txid: null, txids: [txid], status: ActivityStatus.confirmed })
		]);

		await poll(
			buildTx({
				[LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID]: profileId,
				[LIQUIDIUM_EXTERNAL_REF_KEYS.TXID]: txid
			})
		);

		const [[{ update }]] = apply.mock.calls;

		expect(update?.status).toEqual({ Succeeded: null });
	});
});
