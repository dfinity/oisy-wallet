import type { ActiveUserTransaction, CyclesTopUpData } from '$declarations/backend/backend.did';
import { ICP_INDEX_CANISTER_ID } from '$env/networks/networks.icp.env';
import * as icpIndexApi from '$icp/api/icp-index.api';
import * as icpLedgerApi from '$icp/api/icp-ledger.api';
import {
	CMC_DEPOSIT_LANDING_WINDOW_NS,
	CMC_MINT_CYCLES_MEMO,
	CMC_SETTLE_GRACE_OBSERVATIONS,
	CMC_TOP_UP_MEMO
} from '$icp/constants/cmc.constants';
import * as cyclesTopUpServices from '$icp/services/cycles-top-up.services';
import { getCmcDepositAccountIdentifier } from '$icp/utils/cmc.utils';
import { getAccountIdentifier } from '$icp/utils/icp-account.utils';
import { ZERO } from '$lib/constants/app.constants';
import * as activeUserTransactionsServices from '$lib/services/active-user-transactions.services';
import {
	findCyclesTopUpDeposit,
	pollCyclesTopUpActiveUserTransactions,
	resetCyclesTopUpSettleObservations
} from '$lib/services/cycles-top-up-active-tx.services';
import { CYCLES_TOP_UP_EXTERNAL_REF_KEYS } from '$lib/types/cycles-top-up-active-tx';
import {
	toCyclesTopUpExternalRefs,
	toCyclesTopUpExternalRefsMap
} from '$lib/utils/cycles-top-up-active-tx.utils';
import {
	mockCyclesMintActiveUserTransaction,
	mockCyclesTopUpActiveUserTransaction,
	mockCyclesTopUpData
} from '$tests/mocks/active-user-transactions.mock';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import type { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';
import { Principal } from '@icp-sdk/core/principal';

const CANISTER_ID = Principal.fromText('ywcsb-maaaa-aaaai-q6k7a-cai');

const data: CyclesTopUpData = {
	source_token: { IcpNative: null },
	canister_id: CANISTER_ID,
	amount: 100_000_000n,
	transfer_created_at_ns: 1_790_000_000_000_000_000n
};

const DEPOSIT_ACCOUNT_IDENTIFIER = getCmcDepositAccountIdentifier(CANISTER_ID);
const OWN_ACCOUNT_IDENTIFIER = getAccountIdentifier(mockPrincipal).toHex();

const transfer = ({
	id,
	memo = CMC_TOP_UP_MEMO,
	from = OWN_ACCOUNT_IDENTIFIER
}: {
	id: bigint;
	memo?: Uint8Array;
	from?: string;
}): IcpIndexDid.TransactionWithId => ({
	id,
	transaction: {
		memo: ZERO,
		icrc1_memo: [memo],
		operation: {
			Transfer: {
				to: DEPOSIT_ACCOUNT_IDENTIFIER,
				fee: { e8s: 10_000n },
				from,
				amount: { e8s: data.amount },
				spender: []
			}
		},
		timestamp: [{ timestamp_nanos: data.transfer_created_at_ns + id }],
		created_at_time: [{ timestamp_nanos: data.transfer_created_at_ns }]
	}
});

describe('cycles-top-up-active-tx.services', () => {
	describe('findCyclesTopUpDeposit', () => {
		let lookupSpy: ReturnType<typeof vi.spyOn>;

		const find = () => findCyclesTopUpDeposit({ identity: mockIdentity, data });

		beforeEach(() => {
			vi.restoreAllMocks();

			lookupSpy = vi
				.spyOn(icpIndexApi, 'getAccountIdentifierTransactions')
				.mockResolvedValue({ balance: ZERO, transactions: [], oldest_tx_id: [] });
		});

		it('reads the certified history of the canister’s CMC deposit account, not the caller’s', async () => {
			await find();

			expect(lookupSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					identity: mockIdentity,
					accountIdentifier: DEPOSIT_ACCOUNT_IDENTIFIER,
					indexCanisterId: ICP_INDEX_CANISTER_ID,
					certified: true
				})
			);
			expect(lookupSpy).not.toHaveBeenCalledWith(
				expect.objectContaining({
					accountIdentifier: getCmcDepositAccountIdentifier(mockPrincipal)
				})
			);
		});

		it('finds the caller’s transfer with the TPUP memo', async () => {
			lookupSpy.mockResolvedValueOnce({
				balance: ZERO,
				transactions: [transfer({ id: 20n })],
				oldest_tx_id: []
			});

			await expect(find()).resolves.toBe(20n);
		});

		// Everyone who tops the canister up through the CMC pays into the same account.
		it('passes over the same transfer from someone else, and a transfer with the MINT memo', async () => {
			lookupSpy.mockResolvedValueOnce({
				balance: ZERO,
				transactions: [
					transfer({ id: 22n, from: 'another-account' }),
					transfer({ id: 21n, memo: CMC_MINT_CYCLES_MEMO }),
					transfer({ id: 20n })
				],
				oldest_tx_id: []
			});

			await expect(find()).resolves.toBe(20n);
		});
	});

	describe('pollCyclesTopUpActiveUserTransactions', () => {
		let applySpy: ReturnType<typeof vi.spyOn>;
		let notifySpy: ReturnType<typeof vi.spyOn>;
		let lookupSpy: ReturnType<typeof vi.spyOn>;
		let blockTimeSpy: ReturnType<typeof vi.spyOn>;

		const funded: ActiveUserTransaction = mockCyclesTopUpActiveUserTransaction;

		const displayRefs = toCyclesTopUpExternalRefsMap(funded.external_refs);

		delete displayRefs[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.TRANSFER_BLOCK_INDEX];

		// The tab died during the transfer: the row never learned a block.
		const unobserved: ActiveUserTransaction = {
			...funded,
			status: { Pending: null },
			external_refs: toCyclesTopUpExternalRefs(displayRefs),
			created_at_ns: mockCyclesTopUpData.transfer_created_at_ns + 1_000_000_000n
		};

		const landingDeadlineNs = unobserved.created_at_ns + CMC_DEPOSIT_LANDING_WINDOW_NS;

		const poll = (transactions: ActiveUserTransaction[]) =>
			pollCyclesTopUpActiveUserTransactions({ identity: mockIdentity, transactions });

		const pollPastGrace = async (transactions: ActiveUserTransaction[]) => {
			for (let i = 0; i < CMC_SETTLE_GRACE_OBSERVATIONS; i++) {
				await poll(transactions);
			}
		};

		const deposit = (): IcpIndexDid.TransactionWithId => {
			const entry = transfer({ id: 42n });

			return {
				...entry,
				transaction: {
					...entry.transaction,
					operation: {
						Transfer: {
							to: getCmcDepositAccountIdentifier(mockCyclesTopUpData.canister_id),
							fee: { e8s: 10_000n },
							from: OWN_ACCOUNT_IDENTIFIER,
							amount: { e8s: mockCyclesTopUpData.amount },
							spender: []
						}
					},
					created_at_time: [{ timestamp_nanos: mockCyclesTopUpData.transfer_created_at_ns }]
				}
			};
		};

		beforeEach(() => {
			vi.restoreAllMocks();
			resetCyclesTopUpSettleObservations();

			applySpy = vi
				.spyOn(activeUserTransactionsServices, 'applyActiveUserTransactionPollUpdate')
				.mockResolvedValue(true);
			notifySpy = vi
				.spyOn(cyclesTopUpServices, 'notifyCyclesTopUp')
				.mockResolvedValue({ status: 'pending' });
			lookupSpy = vi
				.spyOn(icpIndexApi, 'getAccountIdentifierTransactions')
				.mockResolvedValue({ balance: ZERO, transactions: [], oldest_tx_id: [] });
			vi.spyOn(icpIndexApi, 'getIcpIndexNumBlocksSynced').mockResolvedValue(1_000n);
			// An index that is up to date, but not yet past the landing deadline, by default.
			blockTimeSpy = vi
				.spyOn(icpLedgerApi, 'getIcpLedgerBlockTimestamp')
				.mockResolvedValue(landingDeadlineNs);
		});

		// The modal that opened the row is likely still notifying it.
		it('waits out the grace period, then notifies the deposit for its canister', async () => {
			for (let i = 1; i < CMC_SETTLE_GRACE_OBSERVATIONS; i++) {
				await poll([funded]);
			}

			expect(notifySpy).not.toHaveBeenCalled();

			await poll([funded]);

			expect(notifySpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				blockIndex: 12n,
				canisterId: mockCyclesTopUpData.canister_id
			});
		});

		it('ignores another flow’s row', async () => {
			await pollPastGrace([mockCyclesMintActiveUserTransaction]);

			expect(notifySpy).not.toHaveBeenCalled();
		});

		it('closes a topped-up row as succeeded, with the cycles deposited', async () => {
			notifySpy.mockResolvedValue({ status: 'topped_up', cycles: 2_490_000_000_000n });

			await pollPastGrace([funded]);

			expect(applySpy).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				tx: funded,
				update: {
					status: { Succeeded: null },
					externalRefs: toCyclesTopUpExternalRefs({
						...toCyclesTopUpExternalRefsMap(funded.external_refs),
						[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.OUTCOME]: 'topped_up',
						[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.CYCLES]: '2.49'
					})
				}
			});
		});

		it('closes a refunded row as failed, with the reason and the refund block', async () => {
			notifySpy.mockResolvedValue({
				status: 'refunded',
				reason: 'Canister not found',
				refundBlockIndex: 99n
			});

			await pollPastGrace([funded]);

			expect(applySpy).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					update: expect.objectContaining({
						status: { Failed: null },
						error: 'Canister not found'
					})
				})
			);
		});

		// `Processing` or no answer: the ICP is in the CMC's custody and notifying again can
		// still top it up.
		it('keeps a pending row in flight', async () => {
			await pollPastGrace([funded]);

			expect(applySpy).not.toHaveBeenCalled();
		});

		describe('a row without a deposit', () => {
			it('records a deposit it finds in the canister’s deposit account, then notifies it', async () => {
				lookupSpy.mockResolvedValue({
					balance: ZERO,
					transactions: [deposit()],
					oldest_tx_id: []
				});

				await pollPastGrace([unobserved]);

				expect(lookupSpy).toHaveBeenCalledWith(
					expect.objectContaining({
						accountIdentifier: getCmcDepositAccountIdentifier(mockCyclesTopUpData.canister_id)
					})
				);
				expect(applySpy).toHaveBeenCalledExactlyOnceWith({
					identity: mockIdentity,
					tx: unobserved,
					update: {
						status: { Executing: null },
						externalRefs: toCyclesTopUpExternalRefs({
							...displayRefs,
							[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.TRANSFER_BLOCK_INDEX]: '42'
						})
					}
				});
				expect(notifySpy).toHaveBeenCalledExactlyOnceWith(
					expect.objectContaining({ blockIndex: 42n })
				);
			});

			it('waits while the deposit could still land', async () => {
				await pollPastGrace([unobserved]);

				expect(applySpy).not.toHaveBeenCalled();
				expect(notifySpy).not.toHaveBeenCalled();
			});

			// Nothing moved, and the row says so rather than vanishing.
			it('closes the row as never sent once the index has synced past its landing', async () => {
				blockTimeSpy.mockResolvedValue(landingDeadlineNs + 1n);

				await pollPastGrace([unobserved]);

				expect(applySpy).toHaveBeenCalledExactlyOnceWith({
					identity: mockIdentity,
					tx: unobserved,
					update: {
						status: { Failed: null },
						externalRefs: toCyclesTopUpExternalRefs({
							...displayRefs,
							[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.OUTCOME]: 'not_sent'
						})
					}
				});
				expect(notifySpy).not.toHaveBeenCalled();
			});
		});
	});
});
