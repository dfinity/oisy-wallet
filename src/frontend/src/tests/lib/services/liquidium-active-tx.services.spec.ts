import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import * as liquidiumApi from '$lib/api/liquidium.api';
import { ZERO } from '$lib/constants/app.constants';
import * as activeUserTransactionsServices from '$lib/services/active-user-transactions.services';
import { pollLiquidiumActiveUserTransactions } from '$lib/services/liquidium-active-tx.services';
import { LIQUIDIUM_EXTERNAL_REF_KEYS } from '$lib/types/liquidium-active-tx';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { Activity, InflowActivity, LiquidiumState, OutflowActivity } from '@liquidium/client';

vi.mock('$lib/api/liquidium.api', () => ({ liquidiumClient: vi.fn() }));
vi.mock('$lib/services/active-user-transactions.services', () => ({
	applyActiveUserTransactionPollUpdate: vi.fn()
}));

describe('liquidium-active-tx.services', () => {
	const profileId = 'profile-1';
	const poolId = 'pool-btc';
	const txid = '0xabc123';

	const list = vi.fn();
	const getStatus = vi.fn();
	const apply = vi.mocked(activeUserTransactionsServices.applyActiveUserTransactionPollUpdate);

	const outflowId = 'outflow-1';

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

	const inflowStatus = (state: LiquidiumState): InflowActivity['status'] => ({
		operation: 'deposit',
		state,
		confirmations: null,
		requiredConfirmations: null
	});

	const outflowStatus = (state: LiquidiumState): OutflowActivity['status'] => ({
		operation: 'borrow',
		state,
		confirmations: null,
		requiredConfirmations: null
	});

	const buildActivity = (overrides: Partial<InflowActivity> = {}): Activity => ({
		id: 'act-1',
		poolId,
		asset: 'BTC',
		chain: 'BTC',
		amount: 100n,
		timestampMs: 0,
		txids: [txid],
		status: inflowStatus('confirming'),
		...overrides
	});

	const buildOutflowActivity = (overrides: Partial<OutflowActivity> = {}): Activity => ({
		id: outflowId,
		poolId,
		asset: 'USDC',
		chain: 'ETH',
		amount: 100n,
		timestampMs: 0,
		txids: [],
		status: outflowStatus('confirming'),
		...overrides
	});

	const poll = (tx: ActiveUserTransaction) =>
		pollLiquidiumActiveUserTransactions({ identity: mockIdentity, transactions: [tx] });

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(liquidiumApi.liquidiumClient).mockReturnValue({
			activities: { list, getStatus }
		} as unknown as ReturnType<typeof liquidiumApi.liquidiumClient>);
	});

	it('does nothing for an empty transaction list (no client created)', async () => {
		await pollLiquidiumActiveUserTransactions({ identity: mockIdentity, transactions: [] });

		expect(liquidiumApi.liquidiumClient).not.toHaveBeenCalled();
		expect(apply).not.toHaveBeenCalled();
	});

	it('swallows a polling error without throwing or applying an update', async () => {
		list.mockRejectedValue(new Error('SDK unavailable'));

		await expect(
			poll(
				buildTx({
					[LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID]: profileId,
					[LIQUIDIUM_EXTERNAL_REF_KEYS.TXID]: txid
				})
			)
		).resolves.toBeUndefined();

		expect(apply).not.toHaveBeenCalled();
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
		list.mockResolvedValue([buildActivity({ status: inflowStatus('completed') })]);

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
		list.mockResolvedValue([buildActivity({ status: inflowStatus('failed') })]);

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
		list.mockResolvedValue([buildActivity({ status: inflowStatus('processing') })]);

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
		list.mockResolvedValue([buildActivity({ status: inflowStatus('action_required') })]);

		await poll(
			buildTx({
				[LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID]: profileId,
				[LIQUIDIUM_EXTERNAL_REF_KEYS.TXID]: txid
			})
		);

		expect(apply).not.toHaveBeenCalled();
	});

	it('does nothing when no activity matches the txid', async () => {
		list.mockResolvedValue([
			buildActivity({ txids: ['0xother'], status: inflowStatus('completed') })
		]);

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
		list.mockResolvedValue([
			buildActivity({ txids: ['abc123'], status: inflowStatus('completed') })
		]);

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
		list.mockResolvedValue([buildActivity({ txids: [txid], status: inflowStatus('completed') })]);

		await poll(
			buildTx({
				[LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID]: profileId,
				[LIQUIDIUM_EXTERNAL_REF_KEYS.TXID]: txid
			})
		);

		const [[{ update }]] = apply.mock.calls;

		expect(update?.status).toEqual({ Succeeded: null });
	});

	// Outflows (borrow / withdraw) correlate by the receipt id via `getStatus`, since the
	// on-chain txid may be assigned only later.
	describe('outflow-id correlation (borrow / withdraw)', () => {
		const buildBorrowTx = (refs: Record<string, string>): ActiveUserTransaction => {
			const tx = buildTx(refs);

			if (!('Liquidium' in tx.data)) {
				return tx;
			}

			return { ...tx, data: { Liquidium: { ...tx.data.Liquidium, action: { Borrow: null } } } };
		};

		it('resolves by outflow id via getStatus (not the txid list) and terminalizes', async () => {
			getStatus.mockResolvedValue({
				found: true,
				activity: buildOutflowActivity({ status: outflowStatus('active') })
			});

			await poll(
				buildBorrowTx({
					[LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID]: profileId,
					[LIQUIDIUM_EXTERNAL_REF_KEYS.OUTFLOW_ID]: outflowId
				})
			);

			expect(getStatus).toHaveBeenCalledExactlyOnceWith({ id: outflowId, profileId });
			expect(list).not.toHaveBeenCalled();

			const [[{ update }]] = apply.mock.calls;

			expect(update?.status).toEqual({ Succeeded: null });
		});

		it('advances a sent outflow to Executing', async () => {
			getStatus.mockResolvedValue({
				found: true,
				activity: buildOutflowActivity({ status: outflowStatus('confirming') })
			});

			await poll(
				buildBorrowTx({
					[LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID]: profileId,
					[LIQUIDIUM_EXTERNAL_REF_KEYS.OUTFLOW_ID]: outflowId
				})
			);

			const [[{ update }]] = apply.mock.calls;

			expect(update?.status).toEqual({ Executing: null });
		});

		it('surfaces an error from a failed outflow', async () => {
			getStatus.mockResolvedValue({
				found: true,
				activity: buildOutflowActivity({ status: outflowStatus('failed') })
			});

			await poll(
				buildBorrowTx({
					[LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID]: profileId,
					[LIQUIDIUM_EXTERNAL_REF_KEYS.OUTFLOW_ID]: outflowId
				})
			);

			const [[{ update }]] = apply.mock.calls;

			expect(update?.status).toEqual({ Failed: null });
			expect(update?.error).toBeTruthy();
		});

		it('does nothing while the outflow id is not yet found', async () => {
			getStatus.mockResolvedValue({ found: false, id: outflowId });

			await poll(
				buildBorrowTx({
					[LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID]: profileId,
					[LIQUIDIUM_EXTERNAL_REF_KEYS.OUTFLOW_ID]: outflowId
				})
			);

			expect(apply).not.toHaveBeenCalled();
		});

		it('prefers the outflow id over a later-persisted txid', async () => {
			getStatus.mockResolvedValue({
				found: true,
				activity: buildOutflowActivity({ status: outflowStatus('active') })
			});

			// Both refs present (txid learned after submit): the outflow id still wins.
			await poll(
				buildBorrowTx({
					[LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID]: profileId,
					[LIQUIDIUM_EXTERNAL_REF_KEYS.OUTFLOW_ID]: outflowId,
					[LIQUIDIUM_EXTERNAL_REF_KEYS.TXID]: txid
				})
			);

			expect(getStatus).toHaveBeenCalledExactlyOnceWith({ id: outflowId, profileId });
			expect(list).not.toHaveBeenCalled();

			const [[{ update }]] = apply.mock.calls;

			expect(update?.status).toEqual({ Succeeded: null });
		});
	});
});
