import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import { infuraProviders } from '$eth/providers/infura.providers';
import * as liquidiumApi from '$lib/api/liquidium.api';
import { ZERO } from '$lib/constants/app.constants';
import { LIQUIDIUM_REPAY_TXID_GRACE_OBSERVATIONS } from '$lib/constants/liquidium.constants';
import * as activeUserTransactionsServices from '$lib/services/active-user-transactions.services';
import {
	pollLiquidiumActiveUserTransactions,
	resetLiquidiumRepayTxidObservations
} from '$lib/services/liquidium-active-tx.services';
import { LIQUIDIUM_EXTERNAL_REF_KEYS } from '$lib/types/liquidium-active-tx';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { Activity, InflowActivity, LiquidiumState, OutflowActivity } from '@liquidium/client';

vi.mock('$eth/providers/infura.providers', () => ({ infuraProviders: vi.fn() }));
vi.mock('$lib/api/liquidium.api', () => ({ liquidiumClient: vi.fn() }));
vi.mock('$lib/services/active-user-transactions.services', () => ({
	applyActiveUserTransactionPollUpdate: vi.fn(),
	deleteActiveUserTransaction: vi.fn(),
	reloadActiveUserTransaction: vi.fn()
}));

describe('liquidium-active-tx.services', () => {
	const profileId = 'profile-1';
	const poolId = 'pool-btc';
	const txid = '0xabc123';

	const list = vi.fn();
	const getStatus = vi.fn();
	const getTransactionReceipt = vi.fn();
	const apply = vi.mocked(activeUserTransactionsServices.applyActiveUserTransactionPollUpdate);
	const deleteTx = vi.mocked(activeUserTransactionsServices.deleteActiveUserTransaction);
	const reload = vi.mocked(activeUserTransactionsServices.reloadActiveUserTransaction);

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

	const buildRepayTx = (refs: Record<string, string>): ActiveUserTransaction => {
		const tx = buildTx(refs);

		if (!('Liquidium' in tx.data)) {
			return tx;
		}

		return { ...tx, data: { Liquidium: { ...tx.data.Liquidium, action: { Repay: null } } } };
	};

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
		resetLiquidiumRepayTxidObservations();
		vi.mocked(liquidiumApi.liquidiumClient).mockReturnValue({
			activities: { list, getStatus }
		} as unknown as ReturnType<typeof liquidiumApi.liquidiumClient>);
		vi.mocked(infuraProviders, { partial: true }).mockReturnValue({
			getTransactionReceipt
		});
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

	it('never deletes a supply row without a txid', async () => {
		const tx = buildTx({ [LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID]: profileId });

		for (let tick = 0; tick < LIQUIDIUM_REPAY_TXID_GRACE_OBSERVATIONS; tick++) {
			await poll(tx);
		}

		expect(deleteTx).not.toHaveBeenCalled();
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

	// A repay records its row before the broadcast and adds the txid after it.
	describe('repay rows without a txid', () => {
		const repayWithoutTxid = buildRepayTx({ [LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID]: profileId });

		const repayWithTxid = buildRepayTx({
			[LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID]: profileId,
			[LIQUIDIUM_EXTERNAL_REF_KEYS.TXID]: txid
		});

		beforeEach(() => {
			// The backend agrees with this tab's copy unless a case says otherwise.
			reload.mockResolvedValue(repayWithoutTxid);
		});

		const pollTicks = async ({ tx, ticks }: { tx: ActiveUserTransaction; ticks: number }) => {
			for (let tick = 0; tick < ticks; tick++) {
				await poll(tx);
			}
		};

		it('keeps the row through the grace period', async () => {
			await pollTicks({ tx: repayWithoutTxid, ticks: LIQUIDIUM_REPAY_TXID_GRACE_OBSERVATIONS - 1 });

			expect(reload).not.toHaveBeenCalled();
			expect(deleteTx).not.toHaveBeenCalled();
			expect(list).not.toHaveBeenCalled();
			expect(apply).not.toHaveBeenCalled();
		});

		it('deletes the row once the grace period is over', async () => {
			await pollTicks({ tx: repayWithoutTxid, ticks: LIQUIDIUM_REPAY_TXID_GRACE_OBSERVATIONS });

			expect(reload).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				id: repayWithoutTxid.id
			});
			expect(deleteTx).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				id: repayWithoutTxid.id
			});
			expect(reload.mock.invocationCallOrder[0]).toBeLessThan(deleteTx.mock.invocationCallOrder[0]);
			expect(apply).not.toHaveBeenCalled();
		});

		// The txid write committed but its response was lost, or another tab made it: this tab's copy
		// is stale, and deleting it would drop a repay that was sent.
		it('keeps a row whose txid reached the backend but not this tab', async () => {
			reload.mockResolvedValue(repayWithTxid);

			await pollTicks({ tx: repayWithoutTxid, ticks: LIQUIDIUM_REPAY_TXID_GRACE_OBSERVATIONS });

			expect(reload).toHaveBeenCalledOnce();
			expect(deleteTx).not.toHaveBeenCalled();
		});

		// A broadcast still pending in another tab renews the row; this tab's copy never sees it.
		it("keeps a row the backend shows written since this tab's copy", async () => {
			reload.mockResolvedValue({ ...repayWithoutTxid, updated_at_ns: 1n });

			await pollTicks({ tx: repayWithoutTxid, ticks: LIQUIDIUM_REPAY_TXID_GRACE_OBSERVATIONS });

			expect(reload).toHaveBeenCalledOnce();
			expect(deleteTx).not.toHaveBeenCalled();
		});

		// A lease renewal from the broadcast pending in this tab reaches its own store.
		it('restarts the count when the row is written', async () => {
			const renewed = { ...repayWithoutTxid, updated_at_ns: 1n };

			reload.mockResolvedValue(renewed);

			await pollTicks({ tx: repayWithoutTxid, ticks: LIQUIDIUM_REPAY_TXID_GRACE_OBSERVATIONS - 1 });
			await pollTicks({ tx: renewed, ticks: LIQUIDIUM_REPAY_TXID_GRACE_OBSERVATIONS - 1 });

			expect(reload).not.toHaveBeenCalled();

			await poll(renewed);

			expect(deleteTx).toHaveBeenCalledOnce();
		});

		it('restarts the grace period for a stale copy that was reconciled', async () => {
			reload.mockResolvedValueOnce(repayWithTxid);

			await pollTicks({ tx: repayWithoutTxid, ticks: LIQUIDIUM_REPAY_TXID_GRACE_OBSERVATIONS });
			await pollTicks({ tx: repayWithoutTxid, ticks: LIQUIDIUM_REPAY_TXID_GRACE_OBSERVATIONS - 1 });

			expect(reload).toHaveBeenCalledOnce();
			expect(deleteTx).not.toHaveBeenCalled();
		});

		it("deletes a row the backend no longer has, clearing this tab's copy", async () => {
			reload.mockResolvedValue(undefined);

			await pollTicks({ tx: repayWithoutTxid, ticks: LIQUIDIUM_REPAY_TXID_GRACE_OBSERVATIONS });

			expect(deleteTx).toHaveBeenCalledOnce();
		});

		it('does not delete while the backend row cannot be read, and retries on the next tick', async () => {
			reload.mockRejectedValueOnce(new Error('backend unavailable'));

			await pollTicks({ tx: repayWithoutTxid, ticks: LIQUIDIUM_REPAY_TXID_GRACE_OBSERVATIONS });

			expect(deleteTx).not.toHaveBeenCalled();

			await poll(repayWithoutTxid);

			expect(reload).toHaveBeenCalledTimes(2);
			expect(deleteTx).toHaveBeenCalledOnce();
		});

		it('retries a failed delete on the next tick', async () => {
			deleteTx.mockRejectedValueOnce(new Error('backend unavailable'));

			await pollTicks({ tx: repayWithoutTxid, ticks: LIQUIDIUM_REPAY_TXID_GRACE_OBSERVATIONS });

			expect(deleteTx).toHaveBeenCalledOnce();

			await poll(repayWithoutTxid);

			expect(deleteTx).toHaveBeenCalledTimes(2);
		});

		it('starts the count again after a refresh', async () => {
			await pollTicks({ tx: repayWithoutTxid, ticks: LIQUIDIUM_REPAY_TXID_GRACE_OBSERVATIONS - 1 });

			resetLiquidiumRepayTxidObservations();

			await poll(repayWithoutTxid);

			expect(deleteTx).not.toHaveBeenCalled();
		});

		it('polls a repay row by its txid once it has one', async () => {
			list.mockResolvedValue([buildActivity({ status: inflowStatus('completed') })]);

			await pollTicks({ tx: repayWithTxid, ticks: LIQUIDIUM_REPAY_TXID_GRACE_OBSERVATIONS });

			expect(reload).not.toHaveBeenCalled();
			expect(deleteTx).not.toHaveBeenCalled();
			expect(apply).toHaveBeenCalledWith(
				expect.objectContaining({ update: { status: { Succeeded: null } } })
			);
		});
	});

	describe('repay rows whose Ethereum transfer Liquidium does not list', () => {
		const ethTxid = `0x${'ab'.repeat(32)}`;

		const ethRepay = buildRepayTx({
			[LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID]: profileId,
			[LIQUIDIUM_EXTERNAL_REF_KEYS.TXID]: ethTxid
		});

		beforeEach(() => {
			list.mockResolvedValue([]);
		});

		it('fails the row once the transfer reverted', async () => {
			getTransactionReceipt.mockResolvedValue({ status: 0 });

			await poll(ethRepay);

			expect(getTransactionReceipt).toHaveBeenCalledWith(ethTxid);

			const [[{ update }]] = apply.mock.calls;

			expect(update?.status).toEqual({ Failed: null });
			expect(update?.error).toBeTruthy();
		});

		it('keeps the row while the transfer is not mined', async () => {
			getTransactionReceipt.mockResolvedValue(null);

			await poll(ethRepay);

			expect(apply).not.toHaveBeenCalled();
		});

		it('keeps the row while Liquidium has not listed a successful transfer', async () => {
			getTransactionReceipt.mockResolvedValue({ status: 1 });

			await poll(ethRepay);

			expect(apply).not.toHaveBeenCalled();
		});

		it('follows the activity once Liquidium lists the transfer', async () => {
			list.mockResolvedValue([
				buildActivity({ txids: [ethTxid], status: inflowStatus('completed') })
			]);

			await poll(ethRepay);

			expect(getTransactionReceipt).not.toHaveBeenCalled();
			expect(apply).toHaveBeenCalledWith(
				expect.objectContaining({ update: { status: { Succeeded: null } } })
			);
		});

		it('does not read a receipt for a txid that is not an Ethereum hash', async () => {
			await poll(
				buildRepayTx({
					[LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID]: profileId,
					[LIQUIDIUM_EXTERNAL_REF_KEYS.TXID]: '39851427'
				})
			);

			expect(getTransactionReceipt).not.toHaveBeenCalled();
			expect(apply).not.toHaveBeenCalled();
		});

		it('does not read a receipt for a supply row', async () => {
			await poll(
				buildTx({
					[LIQUIDIUM_EXTERNAL_REF_KEYS.PROFILE_ID]: profileId,
					[LIQUIDIUM_EXTERNAL_REF_KEYS.TXID]: ethTxid
				})
			);

			expect(getTransactionReceipt).not.toHaveBeenCalled();
			expect(apply).not.toHaveBeenCalled();
		});

		it('keeps the row when the receipt cannot be read', async () => {
			getTransactionReceipt.mockRejectedValue(new Error('RPC unavailable'));

			await expect(poll(ethRepay)).resolves.toBeUndefined();

			expect(apply).not.toHaveBeenCalled();
		});
	});
});
