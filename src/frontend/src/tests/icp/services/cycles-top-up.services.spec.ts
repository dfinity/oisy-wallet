import { withdrawCycles } from '$icp/api/cycles-ledger.api';
import { getTransactions } from '$icp/api/icrc-index-ng.api';
import {
	CyclesLedgerWithdrawDuplicateError,
	CyclesLedgerWithdrawFailedError,
	CyclesLedgerWithdrawRefusedError
} from '$icp/canisters/cycles-ledger.errors';
import { topUpCanister } from '$icp/services/cycles-top-up.services';
import type { IcrcTransaction } from '$icp/types/ic-transaction';
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

describe('cycles-top-up.services', () => {
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
