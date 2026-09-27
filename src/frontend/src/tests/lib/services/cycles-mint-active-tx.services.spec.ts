import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import { ICP_INDEX_CANISTER_ID, ICP_LEDGER_CANISTER_ID } from '$env/networks/networks.icp.env';
import * as icpIndexApi from '$icp/api/icp-index.api';
import * as icpLedgerApi from '$icp/api/icp-ledger.api';
import {
	CMC_MINT_CYCLES_MEMO,
	CYCLES_MINT_DEPOSIT_LANDING_WINDOW_NS,
	CYCLES_MINT_SETTLE_GRACE_OBSERVATIONS,
	ICP_LEDGER_PERMITTED_DRIFT_NS
} from '$icp/constants/cmc.constants';
import * as cyclesMintServices from '$icp/services/cycles-mint.services';
import type { CyclesMintNotifyResult } from '$icp/types/cycles-mint';
import { getCyclesMintDepositAccountIdentifier } from '$icp/utils/cycles-mint.utils';
import { getAccountIdentifier } from '$icp/utils/icp-account.utils';
import { ZERO } from '$lib/constants/app.constants';
import * as activeUserTransactionsServices from '$lib/services/active-user-transactions.services';
import {
	findCyclesMintDeposit,
	hasIcpIndexSyncedPast,
	pollCyclesMintActiveUserTransactions,
	resetCyclesMintSettleObservations
} from '$lib/services/cycles-mint-active-tx.services';
import * as cyclesMintAnalytics from '$lib/services/cycles-mint-analytics.services';
import { CYCLES_MINT_EXTERNAL_REF_KEYS } from '$lib/types/cycles-mint-active-tx';
import * as consoleUtils from '$lib/utils/console.utils';
import {
	toCyclesMintExternalRefs,
	toCyclesMintExternalRefsMap
} from '$lib/utils/cycles-mint-active-tx.utils';
import {
	mockCyclesMintActiveUserTransaction,
	mockCyclesMintData,
	mockOisyTradeActiveUserTransaction
} from '$tests/mocks/active-user-transactions.mock';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import type { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';

const CREATED_AT_NS = mockCyclesMintData.transfer_created_at_ns;

const DEPOSIT_ACCOUNT_IDENTIFIER = getCyclesMintDepositAccountIdentifier(mockPrincipal);
const OWN_ACCOUNT_IDENTIFIER = getAccountIdentifier(mockPrincipal).toHex();

const displayRefs = toCyclesMintExternalRefsMap(mockCyclesMintActiveUserTransaction.external_refs);

delete displayRefs[CYCLES_MINT_EXTERNAL_REF_KEYS.TRANSFER_BLOCK_INDEX];

const funded: ActiveUserTransaction = mockCyclesMintActiveUserTransaction;

// The tab died during the transfer: the row never learned a block. The backend stamped the
// row a moment after the tab stamped the transfer.
const unobserved: ActiveUserTransaction = {
	...mockCyclesMintActiveUserTransaction,
	status: { Pending: null },
	external_refs: toCyclesMintExternalRefs(displayRefs),
	created_at_ns: CREATED_AT_NS + 1_000_000_000n
};

// The last moment the row's transfer could land, in IC time.
const LANDING_DEADLINE_NS = unobserved.created_at_ns + CYCLES_MINT_DEPOSIT_LANDING_WINDOW_NS;

const indexEntry = ({
	id,
	timestampNs,
	isDeposit = false,
	from = OWN_ACCOUNT_IDENTIFIER
}: {
	id: bigint;
	timestampNs: bigint;
	isDeposit?: boolean;
	from?: string;
}): IcpIndexDid.TransactionWithId => ({
	id,
	transaction: {
		memo: ZERO,
		icrc1_memo: isDeposit ? [CMC_MINT_CYCLES_MEMO] : [],
		operation: {
			Transfer: {
				to: isDeposit ? DEPOSIT_ACCOUNT_IDENTIFIER : 'another-account',
				fee: { e8s: 10_000n },
				from,
				amount: { e8s: mockCyclesMintData.amount },
				spender: []
			}
		},
		timestamp: [{ timestamp_nanos: timestampNs }],
		created_at_time: [{ timestamp_nanos: isDeposit ? CREATED_AT_NS : timestampNs }]
	}
});

const page = ({
	transactions,
	oldestTxId
}: {
	transactions: IcpIndexDid.TransactionWithId[];
	oldestTxId?: bigint;
}): IcpIndexDid.GetAccountIdentifierTransactionsResponse => ({
	balance: ZERO,
	transactions,
	oldest_tx_id: oldestTxId === undefined ? [] : [oldestTxId]
});

const toMillis = (ns: bigint): number => Number(ns / 1_000_000n);

describe('cycles-mint-active-tx.services', () => {
	let applySpy: ReturnType<typeof vi.spyOn>;
	let deleteSpy: ReturnType<typeof vi.spyOn>;
	let notifySpy: ReturnType<typeof vi.spyOn>;
	let lookupSpy: ReturnType<typeof vi.spyOn>;
	let syncedSpy: ReturnType<typeof vi.spyOn>;
	let blockTimeSpy: ReturnType<typeof vi.spyOn>;
	let trackSpy: ReturnType<typeof vi.spyOn>;

	const poll = (transactions: ActiveUserTransaction[]) =>
		pollCyclesMintActiveUserTransactions({ identity: mockIdentity, transactions });

	// The grace period is counted in the poller's own ticks, so a test that wants it spent
	// has to spend it.
	const pollPastGrace = async (transactions: ActiveUserTransaction[]) => {
		for (let i = 0; i < CYCLES_MINT_SETTLE_GRACE_OBSERVATIONS; i++) {
			await poll(transactions);
		}
	};

	const notifyResolves = (result: CyclesMintNotifyResult) => notifySpy.mockResolvedValue(result);

	beforeEach(() => {
		vi.restoreAllMocks();
		vi.useFakeTimers();
		resetCyclesMintSettleObservations();

		// Well inside the landing window by default.
		vi.setSystemTime(toMillis(CREATED_AT_NS));

		applySpy = vi
			.spyOn(activeUserTransactionsServices, 'applyActiveUserTransactionPollUpdate')
			.mockResolvedValue();
		deleteSpy = vi
			.spyOn(activeUserTransactionsServices, 'deleteActiveUserTransaction')
			.mockResolvedValue();
		notifySpy = vi.spyOn(cyclesMintServices, 'notifyCyclesMint');
		lookupSpy = vi
			.spyOn(icpIndexApi, 'getAccountIdentifierTransactions')
			.mockResolvedValue(page({ transactions: [] }));
		// An index that is up to date, but not yet past the landing deadline, by default.
		syncedSpy = vi.spyOn(icpIndexApi, 'getIcpIndexNumBlocksSynced').mockResolvedValue(1_000n);
		blockTimeSpy = vi
			.spyOn(icpLedgerApi, 'getIcpLedgerBlockTimestamp')
			.mockResolvedValue(LANDING_DEADLINE_NS);
		trackSpy = vi.spyOn(cyclesMintAnalytics, 'trackCyclesMint').mockImplementation(() => undefined);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('pollCyclesMintActiveUserTransactions', () => {
		it('ignores another provider’s row', async () => {
			await pollPastGrace([mockOisyTradeActiveUserTransaction]);

			expect(notifySpy).not.toHaveBeenCalled();
			expect(lookupSpy).not.toHaveBeenCalled();
		});

		// The modal that opened the row is likely still notifying it.
		it('waits out the grace period before touching a row', async () => {
			notifyResolves({ status: 'pending' });

			for (let i = 1; i < CYCLES_MINT_SETTLE_GRACE_OBSERVATIONS; i++) {
				await poll([funded]);
			}

			expect(notifySpy).not.toHaveBeenCalled();

			await poll([funded]);

			expect(notifySpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				blockIndex: 12n
			});
		});

		it('restarts the grace period whenever the row is written', async () => {
			notifyResolves({ status: 'pending' });

			for (let i = 1; i < CYCLES_MINT_SETTLE_GRACE_OBSERVATIONS; i++) {
				await poll([funded]);
			}

			await poll([{ ...funded, updated_at_ns: 1n }]);

			expect(notifySpy).not.toHaveBeenCalled();
		});

		it('closes a minted row as succeeded, with what was credited', async () => {
			notifyResolves({ status: 'minted', minted: 4_500_000_000_000n, balance: ZERO });

			await pollPastGrace([funded]);

			expect(applySpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tx: funded,
				update: {
					status: { Succeeded: null },
					externalRefs: toCyclesMintExternalRefs({
						...toCyclesMintExternalRefsMap(funded.external_refs),
						[CYCLES_MINT_EXTERNAL_REF_KEYS.OUTCOME]: 'minted',
						[CYCLES_MINT_EXTERNAL_REF_KEYS.CREDITED_AMOUNT]: '4.4999'
					})
				}
			});
		});

		it('closes a refunded row as failed, with the reason and the refund block', async () => {
			notifyResolves({ status: 'refunded', reason: 'mint limit', refundBlockIndex: 99n });

			await pollPastGrace([funded]);

			expect(applySpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tx: funded,
				update: {
					status: { Failed: null },
					error: 'mint limit',
					externalRefs: toCyclesMintExternalRefs({
						...toCyclesMintExternalRefsMap(funded.external_refs),
						[CYCLES_MINT_EXTERNAL_REF_KEYS.OUTCOME]: 'refunded',
						[CYCLES_MINT_EXTERNAL_REF_KEYS.REFUND_BLOCK_INDEX]: '99'
					})
				}
			});
		});

		it('closes a row with a final CMC error as failed', async () => {
			notifyResolves({ status: 'failed', reason: 'invalid' });

			await pollPastGrace([funded]);

			expect(applySpy).toHaveBeenCalledWith(
				expect.objectContaining({
					update: expect.objectContaining({ status: { Failed: null }, error: 'invalid' })
				})
			);
		});

		// `Processing` or no answer: the ICP is in the CMC's custody and notifying again
		// can still mint it.
		it('keeps a pending row in flight', async () => {
			notifyResolves({ status: 'pending' });

			await pollPastGrace([funded]);

			expect(applySpy).not.toHaveBeenCalled();
			expect(deleteSpy).not.toHaveBeenCalled();
		});

		// A CMC that keeps a mint pending, or cannot be reached, is asked once per grace
		// period rather than on every tick.
		it('backs off after a pending answer', async () => {
			notifyResolves({ status: 'pending' });

			await pollPastGrace([funded]);

			expect(notifySpy).toHaveBeenCalledOnce();

			for (let i = 1; i < CYCLES_MINT_SETTLE_GRACE_OBSERVATIONS; i++) {
				await poll([funded]);
			}

			expect(notifySpy).toHaveBeenCalledOnce();

			await poll([funded]);

			expect(notifySpy).toHaveBeenCalledTimes(2);
		});

		it('backs off after an error, as after a pending answer', async () => {
			vi.spyOn(consoleUtils, 'consoleError').mockImplementation(() => undefined);

			lookupSpy.mockRejectedValue(new Error('index unreachable'));

			await pollPastGrace([unobserved]);

			expect(lookupSpy).toHaveBeenCalledOnce();

			for (let i = 1; i < CYCLES_MINT_SETTLE_GRACE_OBSERVATIONS; i++) {
				await poll([unobserved]);
			}

			expect(lookupSpy).toHaveBeenCalledOnce();

			await poll([unobserved]);

			expect(lookupSpy).toHaveBeenCalledTimes(2);
		});

		it('keeps polling the other rows when one fails', async () => {
			const consoleErrorSpy = vi
				.spyOn(consoleUtils, 'consoleError')
				.mockImplementation(() => undefined);

			notifySpy
				.mockRejectedValueOnce(new Error('boom'))
				.mockResolvedValue({ status: 'failed', reason: 'invalid' });

			const other = { ...funded, id: 'other' };

			await pollPastGrace([funded, other]);

			expect(consoleErrorSpy).toHaveBeenCalled();
			expect(applySpy).toHaveBeenCalledWith(expect.objectContaining({ tx: other }));
		});

		describe('a row without a deposit', () => {
			it('records a deposit it finds, then notifies it', async () => {
				lookupSpy.mockResolvedValue(
					page({
						transactions: [
							indexEntry({ id: 42n, timestampNs: CREATED_AT_NS + 1n, isDeposit: true })
						]
					})
				);
				notifyResolves({ status: 'pending' });

				await pollPastGrace([unobserved]);

				expect(applySpy).toHaveBeenCalledExactlyOnceWith({
					identity: mockIdentity,
					tx: unobserved,
					update: {
						status: { Executing: null },
						externalRefs: toCyclesMintExternalRefs({
							...displayRefs,
							[CYCLES_MINT_EXTERNAL_REF_KEYS.TRANSFER_BLOCK_INDEX]: '42'
						})
					}
				});
				expect(notifySpy).toHaveBeenCalledExactlyOnceWith({
					identity: mockIdentity,
					blockIndex: 42n
				});
			});

			it('closes a found deposit in the same tick when the CMC has answered', async () => {
				lookupSpy.mockResolvedValue(
					page({
						transactions: [
							indexEntry({ id: 42n, timestampNs: CREATED_AT_NS + 1n, isDeposit: true })
						]
					})
				);
				notifyResolves({ status: 'minted', minted: 1_000_000_000_000n, balance: ZERO });

				await pollPastGrace([unobserved]);

				expect(applySpy).toHaveBeenLastCalledWith(
					expect.objectContaining({
						update: expect.objectContaining({
							status: { Succeeded: null },
							externalRefs: expect.arrayContaining([
								{ key: CYCLES_MINT_EXTERNAL_REF_KEYS.TRANSFER_BLOCK_INDEX, value: '42' }
							])
						})
					})
				);
			});

			const indexSyncedPastLanding = () => blockTimeSpy.mockResolvedValue(LANDING_DEADLINE_NS + 1n);

			// Until the index has synced past the last moment the transfer could land, "not
			// found" only means "not yet".
			it('leaves a row alone until the index has synced past its landing, and backs off', async () => {
				await pollPastGrace([unobserved]);

				expect(lookupSpy).toHaveBeenCalledOnce();
				expect(applySpy).not.toHaveBeenCalled();
				expect(deleteSpy).not.toHaveBeenCalled();
				expect(notifySpy).not.toHaveBeenCalled();

				// The next look waits for a whole grace period again.
				await poll([unobserved]);

				expect(lookupSpy).toHaveBeenCalledOnce();
			});

			// The finding this guards against: a lagging index hides a deposit that landed, and a
			// wall-clock deadline alone would then close a funded mint as never sent.
			it('never closes a row on the poller’s clock alone', async () => {
				vi.setSystemTime(toMillis(LANDING_DEADLINE_NS) + 24 * 60 * 60 * 1_000);

				await pollPastGrace([unobserved]);

				expect(applySpy).not.toHaveBeenCalled();
				expect(deleteSpy).not.toHaveBeenCalled();
			});

			// Nothing moved, but the user started this mint: the row says so rather than
			// vanishing from Active transactions.
			it('closes the row as never sent once the index has synced past its landing', async () => {
				indexSyncedPastLanding();

				await pollPastGrace([unobserved]);

				expect(applySpy).toHaveBeenCalledExactlyOnceWith({
					identity: mockIdentity,
					tx: unobserved,
					update: {
						status: { Failed: null },
						externalRefs: toCyclesMintExternalRefs({
							...displayRefs,
							[CYCLES_MINT_EXTERNAL_REF_KEYS.OUTCOME]: 'not_sent'
						})
					}
				});
				expect(deleteSpy).not.toHaveBeenCalled();
				expect(notifySpy).not.toHaveBeenCalled();
			});

			// Asked after the lookup, the index could take the deposit in between.
			it('asks how far the index has synced before looking the deposit up', async () => {
				indexSyncedPastLanding();

				await pollPastGrace([unobserved]);

				expect(syncedSpy.mock.invocationCallOrder[0]).toBeLessThan(
					lookupSpy.mock.invocationCallOrder[0]
				);
				expect(blockTimeSpy.mock.invocationCallOrder[0]).toBeLessThan(
					lookupSpy.mock.invocationCallOrder[0]
				);
			});

			it('records a deposit the index has taken by then, rather than closing the row', async () => {
				indexSyncedPastLanding();
				lookupSpy.mockResolvedValue(
					page({
						transactions: [
							indexEntry({ id: 42n, timestampNs: CREATED_AT_NS + 1n, isDeposit: true })
						]
					})
				);
				notifyResolves({ status: 'pending' });

				await pollPastGrace([unobserved]);

				expect(applySpy).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({
						update: expect.objectContaining({ status: { Executing: null } })
					})
				);
				expect(notifySpy).toHaveBeenCalledExactlyOnceWith({
					identity: mockIdentity,
					blockIndex: 42n
				});
			});

			// The loader reports the row's ending once, as for every other outcome.
			it('fires no analytics of its own for a row it closes as never sent', async () => {
				indexSyncedPastLanding();

				await pollPastGrace([unobserved]);

				expect(trackSpy).not.toHaveBeenCalled();
			});

			// Every write that learns a deposit also moves the row to `Executing`, so an
			// `Executing` row without one is malformed, not unsent.
			it('never closes an executing row', async () => {
				indexSyncedPastLanding();

				await pollPastGrace([{ ...unobserved, status: { Executing: null } }]);

				expect(applySpy).not.toHaveBeenCalled();
				expect(deleteSpy).not.toHaveBeenCalled();
				expect(syncedSpy).not.toHaveBeenCalled();
			});
		});
	});

	describe('hasIcpIndexSyncedPast', () => {
		const hasSyncedPast = () =>
			hasIcpIndexSyncedPast({ identity: mockIdentity, timestampNs: LANDING_DEADLINE_NS });

		// A "yes" lets a row close as never sent.
		it('reads the index’s height and its last block’s time, certified', async () => {
			await hasSyncedPast();

			expect(syncedSpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				indexCanisterId: ICP_INDEX_CANISTER_ID,
				certified: true
			});
			expect(blockTimeSpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				ledgerCanisterId: ICP_LEDGER_CANISTER_ID,
				index: 999n,
				certified: true
			});
		});

		it('is true once the last synced block is later than the time', async () => {
			blockTimeSpy.mockResolvedValue(LANDING_DEADLINE_NS + 1n);

			await expect(hasSyncedPast()).resolves.toBeTruthy();
		});

		it('is false while the last synced block is not later than the time', async () => {
			blockTimeSpy.mockResolvedValue(LANDING_DEADLINE_NS);

			await expect(hasSyncedPast()).resolves.toBeFalsy();
		});

		// The index is then far behind the ledger anyway.
		it('is false when the ledger has archived the last synced block', async () => {
			blockTimeSpy.mockResolvedValue(undefined);

			await expect(hasSyncedPast()).resolves.toBeFalsy();
		});

		it('is false for an index that has synced nothing, without asking the ledger', async () => {
			syncedSpy.mockResolvedValue(ZERO);

			await expect(hasSyncedPast()).resolves.toBeFalsy();

			expect(blockTimeSpy).not.toHaveBeenCalled();
		});
	});

	describe('findCyclesMintDeposit', () => {
		const find = () => findCyclesMintDeposit({ identity: mockIdentity, data: mockCyclesMintData });

		// Both answers are acted on: a found deposit is notified, and a missing one closes its
		// row as never sent.
		it('reads the history of the caller’s CMC deposit account, certified', async () => {
			await find();

			expect(lookupSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					identity: mockIdentity,
					accountIdentifier: DEPOSIT_ACCOUNT_IDENTIFIER,
					indexCanisterId: ICP_INDEX_CANISTER_ID,
					certified: true
				})
			);
		});

		// That account also sees the burn and the refund of every earlier mint.
		it('passes over the burns and refunds of earlier mints', async () => {
			const burn: IcpIndexDid.TransactionWithId = {
				id: 21n,
				transaction: {
					memo: ZERO,
					icrc1_memo: [],
					operation: {
						Burn: {
							from: DEPOSIT_ACCOUNT_IDENTIFIER,
							amount: { e8s: mockCyclesMintData.amount },
							spender: []
						}
					},
					timestamp: [{ timestamp_nanos: CREATED_AT_NS + 21n }],
					created_at_time: []
				}
			};

			const refund: IcpIndexDid.TransactionWithId = {
				id: 20n,
				transaction: {
					memo: ZERO,
					icrc1_memo: [],
					operation: {
						Transfer: {
							to: 'user-account',
							fee: { e8s: 10_000n },
							from: DEPOSIT_ACCOUNT_IDENTIFIER,
							amount: { e8s: mockCyclesMintData.amount },
							spender: []
						}
					},
					timestamp: [{ timestamp_nanos: CREATED_AT_NS + 20n }],
					created_at_time: []
				}
			};

			lookupSpy.mockResolvedValueOnce(
				page({
					transactions: [
						burn,
						refund,
						indexEntry({ id: 19n, timestampNs: CREATED_AT_NS + 1n, isDeposit: true })
					]
				})
			);

			await expect(find()).resolves.toBe(19n);
		});

		// Anyone can send to that account, with the row's details too.
		it('passes over the same transfer from someone else', async () => {
			lookupSpy.mockResolvedValueOnce(
				page({
					transactions: [
						indexEntry({
							id: 20n,
							timestampNs: CREATED_AT_NS + 2n,
							isDeposit: true,
							from: 'another-account'
						}),
						indexEntry({ id: 19n, timestampNs: CREATED_AT_NS + 1n, isDeposit: true })
					]
				})
			);

			await expect(find()).resolves.toBe(19n);
		});

		it('pages back until it finds the deposit', async () => {
			lookupSpy
				.mockResolvedValueOnce(
					page({
						transactions: [
							indexEntry({ id: 20n, timestampNs: CREATED_AT_NS + 20n }),
							indexEntry({ id: 19n, timestampNs: CREATED_AT_NS + 19n })
						]
					})
				)
				.mockResolvedValueOnce(
					page({
						transactions: [
							indexEntry({ id: 18n, timestampNs: CREATED_AT_NS + 1n, isDeposit: true })
						]
					})
				);

			await expect(find()).resolves.toBe(18n);

			expect(lookupSpy).toHaveBeenNthCalledWith(2, expect.objectContaining({ start: 19n }));
		});

		it('stops at the first entry older than the deposit could be', async () => {
			lookupSpy.mockResolvedValueOnce(
				page({
					transactions: [
						indexEntry({ id: 20n, timestampNs: CREATED_AT_NS }),
						indexEntry({
							id: 19n,
							timestampNs: CREATED_AT_NS - ICP_LEDGER_PERMITTED_DRIFT_NS - 1n
						})
					]
				})
			);

			await expect(find()).resolves.toBeUndefined();

			expect(lookupSpy).toHaveBeenCalledOnce();
		});

		it('keeps paging through entries within the ledger’s permitted drift', async () => {
			lookupSpy
				.mockResolvedValueOnce(
					page({
						transactions: [
							indexEntry({ id: 20n, timestampNs: CREATED_AT_NS - ICP_LEDGER_PERMITTED_DRIFT_NS })
						]
					})
				)
				.mockResolvedValueOnce(page({ transactions: [] }));

			await expect(find()).resolves.toBeUndefined();

			expect(lookupSpy).toHaveBeenCalledTimes(2);
		});

		it('stops when the history is exhausted', async () => {
			lookupSpy.mockResolvedValueOnce(
				page({
					transactions: [indexEntry({ id: 20n, timestampNs: CREATED_AT_NS + 20n })],
					oldestTxId: 20n
				})
			);

			await expect(find()).resolves.toBeUndefined();

			expect(lookupSpy).toHaveBeenCalledOnce();
		});

		it('stops when a page does not move the cursor', async () => {
			lookupSpy.mockResolvedValue(
				page({ transactions: [indexEntry({ id: 20n, timestampNs: CREATED_AT_NS + 20n })] })
			);

			await expect(find()).resolves.toBeUndefined();

			expect(lookupSpy).toHaveBeenCalledTimes(2);
		});
	});
});
