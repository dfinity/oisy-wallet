import { ICP_LEDGER_CANISTER_ID } from '$env/networks/networks.icp.env';
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
import { CMC_TOP_UP_MEMO } from '$icp/constants/cmc.constants';
import {
	notifyCyclesTopUp,
	topUpCanister,
	transferIcpForCyclesTopUp
} from '$icp/services/cycles-top-up.services';
import type { IcrcTransaction } from '$icp/types/ic-transaction';
import { getCmcDepositAccount } from '$icp/utils/cmc.utils';
import { ZERO } from '$lib/constants/app.constants';
import * as consoleUtils from '$lib/utils/console.utils';
import {
	createMockIcrcBurnTransaction,
	createMockIcrcMintTransaction,
	createMockIcrcTransferTransaction
} from '$tests/mocks/ic-transactions.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { Principal } from '@icp-sdk/core/principal';

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
});
