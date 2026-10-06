import { withdrawCycles } from '$icp/api/cycles-ledger.api';
import {
	CyclesLedgerWithdrawDuplicateError,
	CyclesLedgerWithdrawFailedError,
	CyclesLedgerWithdrawRefusedError
} from '$icp/canisters/cycles-ledger.errors';
import { topUpCanister } from '$icp/services/cycles-top-up.services';
import * as consoleUtils from '$lib/utils/console.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { Principal } from '@icp-sdk/core/principal';

vi.mock('$icp/api/cycles-ledger.api', () => ({
	withdrawCycles: vi.fn()
}));

describe('cycles-top-up.services', () => {
	describe('topUpCanister', () => {
		const canisterId = Principal.fromText('ywcsb-maaaa-aaaai-q6k7a-cai');

		const params = {
			identity: mockIdentity,
			canisterId,
			amount: 1_000_000_000_000n,
			createdAt: 1_790_000_000_000_000_000n
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

		it('should report a duplicate as topped up, with the block of the first top-up', async () => {
			vi.mocked(withdrawCycles).mockRejectedValue(new CyclesLedgerWithdrawDuplicateError(6n));

			await expect(topUpCanister(params)).resolves.toEqual({ status: 'topped_up', blockIndex: 6n });
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
