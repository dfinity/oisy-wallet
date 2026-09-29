import type { NotifyMintCyclesSuccess } from '$declarations/cmc/cmc.did';
import { ICP_LEDGER_CANISTER_ID } from '$env/networks/networks.icp.env';
import { notifyMintCycles } from '$icp/api/cmc.api';
import { icrc1Transfer } from '$icp/api/icp-ledger.api';
import {
	CmcNotifyInvalidTransactionError,
	CmcNotifyOtherError,
	CmcNotifyProcessingError,
	CmcNotifyRefundedError,
	CmcNotifyTransactionTooOldError
} from '$icp/canisters/cmc.errors';
import { CMC_MINT_CYCLES_MEMO } from '$icp/constants/cmc.constants';
import { notifyCyclesMint, transferIcpForCyclesMint } from '$icp/services/cycles-mint.services';
import { getCyclesMintDepositAccount } from '$icp/utils/cycles-mint.utils';
import { ZERO } from '$lib/constants/app.constants';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { InsufficientFundsError, TxDuplicateError } from '@icp-sdk/canisters/ledger/icp';

vi.mock('$icp/api/icp-ledger.api', () => ({
	icrc1Transfer: vi.fn()
}));

vi.mock('$icp/api/cmc.api', () => ({
	notifyMintCycles: vi.fn()
}));

describe('cycles-mint.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('transferIcpForCyclesMint', () => {
		const params = { identity: mockIdentity, amount: 100_000_000n, createdAt: 1_790_000_000n };

		it("should send the ICP to the caller's CMC deposit account with the MINT memo", async () => {
			vi.mocked(icrc1Transfer).mockResolvedValue(42n);

			await expect(transferIcpForCyclesMint(params)).resolves.toBe(42n);
			expect(icrc1Transfer).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				to: getCyclesMintDepositAccount(mockIdentity.getPrincipal()),
				amount: params.amount,
				createdAt: params.createdAt,
				memo: CMC_MINT_CYCLES_MEMO,
				ledgerCanisterId: ICP_LEDGER_CANISTER_ID
			});
		});

		it('should return the original block when the ledger sees the same transfer again', async () => {
			vi.mocked(icrc1Transfer).mockRejectedValue(new TxDuplicateError(41n));

			await expect(transferIcpForCyclesMint(params)).resolves.toBe(41n);
		});

		it('should rethrow any other transfer failure', async () => {
			const err = new InsufficientFundsError(ZERO);
			vi.mocked(icrc1Transfer).mockRejectedValue(err);

			await expect(transferIcpForCyclesMint(params)).rejects.toBe(err);
		});

		it('should throw without an identity, before sending anything', async () => {
			await expect(transferIcpForCyclesMint({ ...params, identity: undefined })).rejects.toThrow();
			expect(icrc1Transfer).not.toHaveBeenCalled();
		});
	});

	describe('notifyCyclesMint', () => {
		const params = { identity: mockIdentity, blockIndex: 42n };

		it('should report the mint when the CMC mints', async () => {
			const success: NotifyMintCyclesSuccess = {
				block_index: 7n,
				minted: 2_500_000_000_000n,
				balance: 2_499_900_000_000n
			};
			vi.mocked(notifyMintCycles).mockResolvedValue(success);

			await expect(notifyCyclesMint(params)).resolves.toEqual({
				status: 'minted',
				minted: success.minted,
				balance: success.balance
			});
			expect(notifyMintCycles).toHaveBeenCalledExactlyOnceWith(params);
		});

		it('should report a refund with its block', async () => {
			vi.mocked(notifyMintCycles).mockRejectedValue(
				new CmcNotifyRefundedError(43n, 'Minting limit reached')
			);

			await expect(notifyCyclesMint(params)).resolves.toEqual({
				status: 'refunded',
				reason: 'Minting limit reached',
				refundBlockIndex: 43n
			});
		});

		it('should report a refund without a block', async () => {
			vi.mocked(notifyMintCycles).mockRejectedValue(
				new CmcNotifyRefundedError(undefined, 'Too small')
			);

			await expect(notifyCyclesMint(params)).resolves.toEqual({
				status: 'refunded',
				reason: 'Too small'
			});
		});

		it.each([
			{
				label: 'a block the CMC can no longer process',
				err: new CmcNotifyTransactionTooOldError(1_000n)
			},
			{ label: 'an invalid transaction', err: new CmcNotifyInvalidTransactionError('Wrong memo') },
			{ label: 'a final CMC error', err: new CmcNotifyOtherError(6n, 'Memo too long') }
		])('should report $label as failed', async ({ err }) => {
			vi.mocked(notifyMintCycles).mockRejectedValue(err);

			await expect(notifyCyclesMint(params)).resolves.toEqual({
				status: 'failed',
				reason: err.message
			});
		});

		it.each([
			{ label: 'another notify of the same block', err: new CmcNotifyProcessingError() },
			{ label: 'a transient CMC error', err: new CmcNotifyOtherError(2n, 'Failed to fetch block') },
			{ label: 'a call that got no answer', err: new Error('Network error') }
		])('should keep the mint pending after $label', async ({ err }) => {
			vi.mocked(notifyMintCycles).mockRejectedValue(err);

			await expect(notifyCyclesMint(params)).resolves.toEqual({ status: 'pending' });
		});

		it('should throw without an identity rather than report the mint pending', async () => {
			await expect(notifyCyclesMint({ ...params, identity: undefined })).rejects.toThrow();
			expect(notifyMintCycles).not.toHaveBeenCalled();
		});
	});
});
