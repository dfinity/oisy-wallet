import { ICP_LEDGER_CANISTER_ID } from '$env/networks/networks.icp.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { notifyTopUp } from '$icp/api/cmc.api';
import { withdrawCycles } from '$icp/api/cycles-ledger.api';
import { icrc1Transfer } from '$icp/api/icp-ledger.api';
import { getTransactions } from '$icp/api/icrc-index-ng.api';
import { CmcNotifyProcessingError, CmcNotifyRefundedError } from '$icp/canisters/cmc.errors';
import {
	CyclesLedgerWithdrawDuplicateError,
	CyclesLedgerWithdrawFailedError,
	CyclesLedgerWithdrawRefusedError
} from '$icp/canisters/cycles-ledger.errors';
import {
	CMC_NOTIFY_ATTEMPTS,
	CMC_TOP_UP_MEMO,
	CMC_TRANSFER_START_WINDOW_NS
} from '$icp/constants/cmc.constants';
import {
	notifyCyclesTopUp,
	topUpCanister,
	topUpCanisterWithIcp,
	transferIcpForCyclesTopUp
} from '$icp/services/cycles-top-up.services';
import { CyclesTopUpIcpError } from '$icp/types/cycles-top-up';
import type { IcrcTransaction } from '$icp/types/ic-transaction';
import { getCmcDepositAccount } from '$icp/utils/cmc.utils';
import { ZERO } from '$lib/constants/app.constants';
import { PLAUSIBLE_EVENT_RESULT_STATUSES } from '$lib/enums/plausible';
import { ProgressStepsCyclesTopUp } from '$lib/enums/progress-steps';
import {
	createActiveUserTransaction,
	deleteActiveUserTransaction,
	updateActiveUserTransaction
} from '$lib/services/active-user-transactions.services';
import { trackCyclesTopUp } from '$lib/services/cycles-top-up-analytics.services';
import { CYCLES_TOP_UP_EXTERNAL_REF_KEYS } from '$lib/types/cycles-top-up-active-tx';
import * as consoleUtils from '$lib/utils/console.utils';
import { toCyclesTopUpExternalRefs } from '$lib/utils/cycles-top-up-active-tx.utils';
import { waitForMilliseconds } from '$lib/utils/timeout.utils';
import {
	createMockIcrcBurnTransaction,
	createMockIcrcMintTransaction,
	createMockIcrcTransferTransaction
} from '$tests/mocks/ic-transactions.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { InsufficientFundsError } from '@icp-sdk/canisters/ledger/icp';
import { Principal } from '@icp-sdk/core/principal';
import type { MockInstance } from 'vitest';

vi.mock('$icp/api/cycles-ledger.api', () => ({
	withdrawCycles: vi.fn()
}));

vi.mock('$icp/api/icrc-index-ng.api', () => ({
	getTransactions: vi.fn()
}));

vi.mock('$icp/api/icp-ledger.api', () => ({
	icrc1Transfer: vi.fn()
}));

vi.mock('$icp/api/cmc.api', () => ({
	notifyTopUp: vi.fn()
}));

vi.mock('$lib/services/active-user-transactions.services', () => ({
	createActiveUserTransaction: vi.fn(),
	updateActiveUserTransaction: vi.fn(),
	deleteActiveUserTransaction: vi.fn()
}));

vi.mock('$lib/services/cycles-top-up-analytics.services', () => ({
	trackCyclesTopUp: vi.fn()
}));

vi.mock('$lib/utils/timeout.utils', () => ({
	waitForMilliseconds: vi.fn()
}));

describe('cycles-top-up.services', () => {
	describe('transferIcpForCyclesTopUp', () => {
		const canisterId = Principal.fromText('ywcsb-maaaa-aaaai-q6k7a-cai');

		const params = {
			identity: mockIdentity,
			canisterId,
			amount: 100_000_000n,
			createdAt: 1_790_000_000_000_000_000n
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it("should send the ICP to the CMC's deposit account for the canister with the TPUP memo", async () => {
			vi.mocked(icrc1Transfer).mockResolvedValue(42n);

			await expect(transferIcpForCyclesTopUp(params)).resolves.toBe(42n);
			expect(icrc1Transfer).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				to: getCmcDepositAccount(canisterId),
				amount: params.amount,
				createdAt: params.createdAt,
				memo: CMC_TOP_UP_MEMO,
				ledgerCanisterId: ICP_LEDGER_CANISTER_ID
			});
		});

		it('should send TPUP as an 8-byte little-endian number', () => {
			const view = new DataView(CMC_TOP_UP_MEMO.buffer);

			expect(CMC_TOP_UP_MEMO).toHaveLength(8);
			expect(view.getBigUint64(0, true)).toBe(0x50555054n);
		});

		it('should throw without an identity, before sending anything', async () => {
			await expect(transferIcpForCyclesTopUp({ ...params, identity: undefined })).rejects.toThrow();
			expect(icrc1Transfer).not.toHaveBeenCalled();
		});
	});

	describe('notifyCyclesTopUp', () => {
		const params = {
			identity: mockIdentity,
			blockIndex: 42n,
			canisterId: Principal.fromText('ywcsb-maaaa-aaaai-q6k7a-cai')
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should report the cycles the CMC deposited into the canister', async () => {
			vi.mocked(notifyTopUp).mockResolvedValue(2_500_000_000_000n);

			await expect(notifyCyclesTopUp(params)).resolves.toEqual({
				status: 'topped_up',
				cycles: 2_500_000_000_000n
			});
			expect(notifyTopUp).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				blockIndex: 42n,
				to: params.canisterId
			});
		});

		it('should report a refund with its block', async () => {
			vi.mocked(notifyTopUp).mockRejectedValue(
				new CmcNotifyRefundedError(43n, 'Canister not found')
			);

			await expect(notifyCyclesTopUp(params)).resolves.toEqual({
				status: 'refunded',
				reason: 'Canister not found',
				refundBlockIndex: 43n
			});
		});

		it('should keep the top-up pending while the CMC is processing', async () => {
			vi.mocked(notifyTopUp).mockRejectedValue(new CmcNotifyProcessingError());

			await expect(notifyCyclesTopUp(params)).resolves.toEqual({ status: 'pending' });
		});

		it('should throw without an identity rather than report the top-up pending', async () => {
			await expect(notifyCyclesTopUp({ ...params, identity: undefined })).rejects.toThrow();
			expect(notifyTopUp).not.toHaveBeenCalled();
		});
	});

	describe('topUpCanister', () => {
		const canisterId = Principal.fromText('ywcsb-maaaa-aaaai-q6k7a-cai');

		const params = {
			identity: mockIdentity,
			canisterId,
			amount: 1_000_000_000_000n,
			createdAt: 1_790_000_000_000_000_000n,
			indexCanisterId: 'ul4oc-4iaaa-aaaaq-qaabq-cai'
		};

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(consoleUtils, 'consoleError').mockImplementation(() => {});
		});

		it('should withdraw the amount to the canister with the creation time', async () => {
			vi.mocked(withdrawCycles).mockResolvedValue(7n);

			await expect(topUpCanister(params)).resolves.toEqual({ status: 'topped_up', blockIndex: 7n });
			expect(withdrawCycles).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				to: canisterId,
				amount: 1_000_000_000_000n,
				createdAt: 1_790_000_000_000_000_000n
			});
		});

		describe('on a duplicate', () => {
			const refundMemo = new Uint8Array(32).fill(0xff);

			// The first top-up's burn, and the mint that refunds it after a failed deposit: the
			// amount minus the 0.0001 TCYCLES fee.
			const burn = createMockIcrcBurnTransaction({ id: 6n, amount: 1_000_000_000_000n });
			const refund = createMockIcrcMintTransaction({
				id: 9n,
				amount: 999_900_000_000n,
				memo: refundMemo
			});

			// The index lists the newest first.
			const listed = (transactions: IcrcTransaction[]) =>
				vi.mocked(getTransactions).mockResolvedValue({
					balance: ZERO,
					transactions,
					oldest_tx_id: []
				});

			beforeEach(() => {
				vi.mocked(withdrawCycles).mockRejectedValue(new CyclesLedgerWithdrawDuplicateError(6n));
			});

			it('should report it as topped up, with the first burn, when no refund followed', async () => {
				listed([createMockIcrcTransferTransaction({ id: 8n }), burn]);

				await expect(topUpCanister(params)).resolves.toEqual({
					status: 'topped_up',
					blockIndex: 6n
				});
				expect(getTransactions).toHaveBeenCalledExactlyOnceWith({
					identity: mockIdentity,
					owner: mockIdentity.getPrincipal(),
					indexCanisterId: 'ul4oc-4iaaa-aaaaq-qaabq-cai',
					maxResults: 100n
				});
			});

			it('should report it as refunded, with the refund block, when the ledger refunded it', async () => {
				listed([refund, createMockIcrcTransferTransaction({ id: 8n }), burn]);

				await expect(topUpCanister(params)).resolves.toEqual({
					status: 'refunded',
					refundBlockIndex: 9n
				});
			});

			it.each([
				{
					name: 'a mint of another amount',
					mint: createMockIcrcMintTransaction({ id: 9n, amount: 500_000_000n, memo: refundMemo })
				},
				{
					name: 'a mint with another memo',
					mint: createMockIcrcMintTransaction({ id: 9n, amount: 999_900_000_000n })
				},
				{
					name: 'a refund from before the burn',
					mint: createMockIcrcMintTransaction({
						id: 5n,
						amount: 999_900_000_000n,
						memo: refundMemo
					})
				}
			])('should not take $name for its refund', async ({ mint }) => {
				listed(mint.id > burn.id ? [mint, burn] : [burn, mint]);

				await expect(topUpCanister(params)).resolves.toEqual({
					status: 'topped_up',
					blockIndex: 6n
				});
			});

			it('should leave a refund after a later burn of the same amount to that burn', async () => {
				listed([
					refund,
					createMockIcrcBurnTransaction({ id: 8n, amount: 1_000_000_000_000n }),
					burn
				]);

				await expect(topUpCanister(params)).resolves.toEqual({
					status: 'topped_up',
					blockIndex: 6n
				});
			});

			it('should report it as unknown when the index does not list the first burn', async () => {
				listed([refund]);

				await expect(topUpCanister(params)).resolves.toEqual({ status: 'unknown' });
			});

			it('should report it as unknown without an index to read it from', async () => {
				await expect(topUpCanister({ ...params, indexCanisterId: undefined })).resolves.toEqual({
					status: 'unknown'
				});
				expect(getTransactions).not.toHaveBeenCalled();
			});

			it('should report it as unknown when the lookup fails', async () => {
				const err = new Error('Index unavailable');
				vi.mocked(getTransactions).mockRejectedValue(err);

				await expect(topUpCanister(params)).resolves.toEqual({ status: 'unknown' });
				expect(consoleUtils.consoleError).toHaveBeenCalledExactlyOnceWith(err);
			});
		});

		it('should report a failed deposit as refunded, with the refund block', async () => {
			vi.mocked(withdrawCycles).mockRejectedValue(
				new CyclesLedgerWithdrawFailedError(8n, 'Canister not found')
			);

			await expect(topUpCanister(params)).resolves.toEqual({
				status: 'refunded',
				refundBlockIndex: 8n
			});
		});

		it('should report a failed deposit without a refund block', async () => {
			vi.mocked(withdrawCycles).mockRejectedValue(
				new CyclesLedgerWithdrawFailedError(undefined, 'Canister not found')
			);

			await expect(topUpCanister(params)).resolves.toEqual({ status: 'refunded' });
		});

		it('should report a refusal with its reason', async () => {
			vi.mocked(withdrawCycles).mockRejectedValue(
				new CyclesLedgerWithdrawRefusedError('created_in_future', 'Ahead of the ledger time')
			);

			await expect(topUpCanister(params)).resolves.toEqual({
				status: 'refused',
				refusal: 'created_in_future'
			});
		});

		it('should report a call without an answer as unknown', async () => {
			const err = new Error('Request timed out');
			vi.mocked(withdrawCycles).mockRejectedValue(err);

			await expect(topUpCanister(params)).resolves.toEqual({ status: 'unknown' });
			expect(consoleUtils.consoleError).toHaveBeenCalledExactlyOnceWith(err);
		});

		it('should throw if identity is undefined', async () => {
			await expect(topUpCanister({ ...params, identity: undefined })).rejects.toThrow();
			expect(withdrawCycles).not.toHaveBeenCalled();
		});
	});

	describe('topUpCanisterWithIcp', () => {
		const NOW_MS = 1_790_000_000_000;
		const NOW_NS = BigInt(NOW_MS) * 1_000_000n;

		// The transfer timestamp's random sub-millisecond digits.
		const SUB_MS_NS = 123_456n;
		const STAMP_NS = NOW_NS + SUB_MS_NS;

		const canisterId = Principal.fromText('ywcsb-maaaa-aaaai-q6k7a-cai');

		let randomSpy: MockInstance;

		const progress = vi.fn();

		const params = {
			identity: mockIdentity,
			topUpId: 'top-up-1',
			sourceToken: ICP_TOKEN,
			canisterId,
			amount: 150_000_000n,
			usdSourceValue: '4.5',
			progress
		};

		const displayRefs = {
			[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.AMOUNT]: '1.5',
			[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.USD_SOURCE_VALUE]: '4.5',
			[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL]: 'ICP',
			[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.SOURCE_NETWORK_SYMBOL]: ICP_TOKEN.network.name
		};

		beforeEach(() => {
			vi.clearAllMocks();
			vi.useFakeTimers();
			vi.setSystemTime(NOW_MS);

			randomSpy = vi.spyOn(crypto, 'getRandomValues').mockImplementation((array) => {
				(array as Uint32Array)[0] = Number(SUB_MS_NS);

				return array;
			});

			vi.spyOn(consoleUtils, 'consoleError').mockImplementation(() => undefined);

			vi.mocked(createActiveUserTransaction).mockResolvedValue();
			vi.mocked(updateActiveUserTransaction).mockResolvedValue();
			vi.mocked(deleteActiveUserTransaction).mockResolvedValue();
			vi.mocked(waitForMilliseconds).mockResolvedValue();
			vi.mocked(icrc1Transfer).mockResolvedValue(42n);
			vi.mocked(notifyTopUp).mockResolvedValue(2_490_000_000_000n);
		});

		afterEach(() => {
			vi.useRealTimers();
			randomSpy.mockRestore();
		});

		const errorKind = async (): Promise<string | undefined> => {
			try {
				await topUpCanisterWithIcp(params);
			} catch (err: unknown) {
				return err instanceof CyclesTopUpIcpError ? err.kind : undefined;
			}
		};

		it('opens the row before anything moves, with the canister and the transfer timestamp', async () => {
			await topUpCanisterWithIcp(params);

			expect(createActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				id: 'top-up-1',
				data: {
					CyclesTopUp: {
						source_token: { Icrc: Principal.fromText(ICP_TOKEN.ledgerCanisterId) },
						canister_id: canisterId,
						amount: 150_000_000n,
						transfer_created_at_ns: STAMP_NS
					}
				},
				externalRefs: toCyclesTopUpExternalRefs(displayRefs)
			});
			expect(icrc1Transfer).toHaveBeenCalledWith(
				expect.objectContaining({
					to: getCmcDepositAccount(canisterId),
					amount: 150_000_000n,
					createdAt: STAMP_NS,
					memo: CMC_TOP_UP_MEMO
				})
			);
			expect(vi.mocked(createActiveUserTransaction).mock.invocationCallOrder[0]).toBeLessThan(
				vi.mocked(icrc1Transfer).mock.invocationCallOrder[0]
			);
		});

		it('tops up, records each step on the row and returns the cycles deposited', async () => {
			await expect(topUpCanisterWithIcp(params)).resolves.toEqual({
				status: 'topped_up',
				cycles: 2_490_000_000_000n
			});

			expect(notifyTopUp).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				blockIndex: 42n,
				to: canisterId
			});
			expect(updateActiveUserTransaction).toHaveBeenNthCalledWith(1, {
				identity: mockIdentity,
				id: 'top-up-1',
				status: { Executing: null },
				externalRefs: toCyclesTopUpExternalRefs({
					...displayRefs,
					[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.TRANSFER_BLOCK_INDEX]: '42'
				})
			});
			expect(updateActiveUserTransaction).toHaveBeenNthCalledWith(2, {
				identity: mockIdentity,
				id: 'top-up-1',
				status: { Succeeded: null },
				externalRefs: toCyclesTopUpExternalRefs({
					...displayRefs,
					[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.TRANSFER_BLOCK_INDEX]: '42',
					[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.OUTCOME]: 'topped_up',
					[CYCLES_TOP_UP_EXTERNAL_REF_KEYS.CYCLES]: '2.49'
				})
			});
			expect(progress.mock.calls).toEqual([
				[ProgressStepsCyclesTopUp.TRANSFER],
				[ProgressStepsCyclesTopUp.TOP_UP]
			]);
		});

		// The terminal event is the Active transactions loader's, once per row.
		it('reports the top-up as executing from the navigation, and leaves its outcome to the row', async () => {
			await topUpCanisterWithIcp(params);

			expect(trackCyclesTopUp).toHaveBeenCalledExactlyOnceWith({
				step: 'top_up',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.EXECUTING,
				tokenSymbol: 'ICP',
				sourceLocation: 'navigation'
			});
		});

		it('returns a refund and closes the row as failed', async () => {
			vi.mocked(notifyTopUp).mockRejectedValue(
				new CmcNotifyRefundedError(43n, 'Canister not found')
			);

			await expect(topUpCanisterWithIcp(params)).resolves.toEqual({
				status: 'refunded',
				reason: 'Canister not found',
				refundBlockIndex: 43n
			});

			expect(updateActiveUserTransaction).toHaveBeenLastCalledWith(
				expect.objectContaining({ status: { Failed: null }, error: 'Canister not found' })
			);
		});

		it('notifies again while the CMC is still processing', async () => {
			vi.mocked(notifyTopUp)
				.mockRejectedValueOnce(new CmcNotifyProcessingError())
				.mockResolvedValue(2_490_000_000_000n);

			await expect(topUpCanisterWithIcp(params)).resolves.toEqual(
				expect.objectContaining({ status: 'topped_up' })
			);

			expect(notifyTopUp).toHaveBeenCalledTimes(2);
			expect(waitForMilliseconds).toHaveBeenCalledOnce();
		});

		// The ICP is in the CMC's custody: never reported as failed, finished in the background.
		it('hands a top-up the CMC has not answered to the background', async () => {
			vi.mocked(notifyTopUp).mockRejectedValue(new CmcNotifyProcessingError());

			await expect(topUpCanisterWithIcp(params)).resolves.toEqual({ status: 'pending' });

			expect(notifyTopUp).toHaveBeenCalledTimes(CMC_NOTIFY_ATTEMPTS);
			expect(updateActiveUserTransaction).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ status: { Executing: null } })
			);
		});

		// Fail-closed: without the row, the canister would be lost with the tab.
		it('does not start when the row cannot be opened', async () => {
			vi.mocked(createActiveUserTransaction).mockRejectedValue(new Error('cap reached'));

			await expect(errorKind()).resolves.toBe('not_trackable');

			expect(icrc1Transfer).not.toHaveBeenCalled();
			expect(trackCyclesTopUp).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
					errorCode: 'not_trackable'
				})
			);
		});

		it('abandons a top-up whose tab was suspended before sending', async () => {
			vi.mocked(createActiveUserTransaction).mockImplementation(() => {
				vi.setSystemTime(NOW_MS + Number(CMC_TRANSFER_START_WINDOW_NS / 1_000_000n) + 1);

				return Promise.resolve();
			});

			await expect(errorKind()).resolves.toBe('timed_out');

			expect(icrc1Transfer).not.toHaveBeenCalled();
			expect(deleteActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				id: 'top-up-1'
			});
		});

		// The ledger answered and refused: nothing moved, and the modal shows it.
		it('deletes the row of a transfer the ledger refused', async () => {
			vi.mocked(icrc1Transfer).mockRejectedValue(new InsufficientFundsError(ZERO));

			await expect(errorKind()).resolves.toBe('transfer_failed');

			expect(deleteActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				id: 'top-up-1'
			});
			expect(notifyTopUp).not.toHaveBeenCalled();
		});

		// No answer: the transfer may have landed, and the poller finds out from the ICP history.
		it('keeps the row of a transfer that got no answer', async () => {
			vi.mocked(icrc1Transfer).mockRejectedValue(new Error('Network error'));

			await expect(errorKind()).resolves.toBe('unconfirmed');

			expect(deleteActiveUserTransaction).not.toHaveBeenCalled();
			expect(notifyTopUp).not.toHaveBeenCalled();
		});
	});
});
