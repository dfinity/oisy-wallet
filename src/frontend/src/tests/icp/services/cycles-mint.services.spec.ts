import type { NotifyMintCyclesSuccess } from '$declarations/cmc/cmc.did';
import { ICP_LEDGER_CANISTER_ID } from '$env/networks/networks.icp.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { notifyMintCycles } from '$icp/api/cmc.api';
import { icrc1Transfer } from '$icp/api/icp-ledger.api';
import {
	CmcNotifyInvalidTransactionError,
	CmcNotifyOtherError,
	CmcNotifyProcessingError,
	CmcNotifyRefundedError,
	CmcNotifyTransactionTooOldError
} from '$icp/canisters/cmc.errors';
import {
	CMC_MINT_CYCLES_MEMO,
	CYCLES_MINT_NOTIFY_ATTEMPTS,
	CYCLES_MINT_TRANSFER_START_WINDOW_NS
} from '$icp/constants/cmc.constants';
import {
	mintCycles,
	notifyCyclesMint,
	transferIcpForCyclesMint
} from '$icp/services/cycles-mint.services';
import { CyclesMintError } from '$icp/types/cycles-mint';
import { getCyclesMintDepositAccount } from '$icp/utils/cycles-mint.utils';
import { ZERO } from '$lib/constants/app.constants';
import { PLAUSIBLE_EVENT_RESULT_STATUSES } from '$lib/enums/plausible';
import { ProgressStepsCyclesMint } from '$lib/enums/progress-steps';
import {
	createActiveUserTransaction,
	deleteActiveUserTransaction,
	updateActiveUserTransaction
} from '$lib/services/active-user-transactions.services';
import { trackCyclesMint } from '$lib/services/cycles-mint-analytics.services';
import { CYCLES_MINT_EXTERNAL_REF_KEYS } from '$lib/types/cycles-mint-active-tx';
import * as consoleUtils from '$lib/utils/console.utils';
import { toCyclesMintExternalRefs } from '$lib/utils/cycles-mint-active-tx.utils';
import { waitForMilliseconds } from '$lib/utils/timeout.utils';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
import { InsufficientFundsError, TxDuplicateError } from '@icp-sdk/canisters/ledger/icp';
import { Principal } from '@icp-sdk/core/principal';

vi.mock('$icp/api/icp-ledger.api', () => ({
	icrc1Transfer: vi.fn()
}));

vi.mock('$icp/api/cmc.api', () => ({
	notifyMintCycles: vi.fn()
}));

vi.mock('$lib/services/active-user-transactions.services', () => ({
	createActiveUserTransaction: vi.fn(),
	updateActiveUserTransaction: vi.fn(),
	deleteActiveUserTransaction: vi.fn()
}));

vi.mock('$lib/services/cycles-mint-analytics.services', () => ({
	trackCyclesMint: vi.fn()
}));

vi.mock('$lib/utils/timeout.utils', () => ({
	waitForMilliseconds: vi.fn()
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

	describe('mintCycles', () => {
		const NOW_MS = 1_790_000_000_000;
		const NOW_NS = BigInt(NOW_MS) * 1_000_000n;

		const TCYCLES_TOKEN = {
			...mockValidIcrcToken,
			symbol: 'TCYCLES',
			decimals: 12,
			ledgerCanisterId: 'um5iw-rqaaa-aaaaq-qaaba-cai'
		};

		const progress = vi.fn();

		const params = {
			identity: mockIdentity,
			mintId: 'mint-1',
			sourceToken: ICP_TOKEN,
			destinationToken: TCYCLES_TOKEN,
			amount: 150_000_000n,
			estimatedCredited: 4_499_900_000_000n,
			usdSourceValue: '4.5',
			progress
		};

		const displayRefs = {
			[CYCLES_MINT_EXTERNAL_REF_KEYS.AMOUNT]: '1.5',
			[CYCLES_MINT_EXTERNAL_REF_KEYS.USD_SOURCE_VALUE]: '4.5',
			[CYCLES_MINT_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL]: 'ICP',
			[CYCLES_MINT_EXTERNAL_REF_KEYS.SOURCE_NETWORK_SYMBOL]: ICP_TOKEN.network.name,
			[CYCLES_MINT_EXTERNAL_REF_KEYS.DESTINATION_TOKEN_SYMBOL]: 'TCYCLES',
			[CYCLES_MINT_EXTERNAL_REF_KEYS.DESTINATION_NETWORK_SYMBOL]: TCYCLES_TOKEN.network.name
		};

		const success: NotifyMintCyclesSuccess = {
			block_index: 7n,
			minted: 4_500_000_000_000n,
			balance: 4_499_900_000_000n
		};

		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(NOW_MS);

			vi.spyOn(consoleUtils, 'consoleError').mockImplementation(() => undefined);

			vi.mocked(createActiveUserTransaction).mockResolvedValue();
			vi.mocked(updateActiveUserTransaction).mockResolvedValue();
			vi.mocked(deleteActiveUserTransaction).mockResolvedValue();
			vi.mocked(waitForMilliseconds).mockResolvedValue();
			vi.mocked(icrc1Transfer).mockResolvedValue(42n);
			vi.mocked(notifyMintCycles).mockResolvedValue(success);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		const errorKind = async (): Promise<string | undefined> => {
			try {
				await mintCycles(params);
			} catch (err: unknown) {
				return err instanceof CyclesMintError ? err.kind : undefined;
			}
		};

		it('opens the row before anything moves, with the transfer timestamp it then uses', async () => {
			await mintCycles(params);

			expect(createActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				id: 'mint-1',
				data: {
					CyclesMint: {
						source_token: { Icrc: Principal.fromText(ICP_TOKEN.ledgerCanisterId) },
						dest_token: { Icrc: Principal.fromText(TCYCLES_TOKEN.ledgerCanisterId) },
						amount: 150_000_000n,
						transfer_created_at_ns: NOW_NS
					}
				},
				externalRefs: toCyclesMintExternalRefs(displayRefs)
			});
			expect(icrc1Transfer).toHaveBeenCalledWith(
				expect.objectContaining({ amount: 150_000_000n, createdAt: NOW_NS })
			);
			expect(vi.mocked(createActiveUserTransaction).mock.invocationCallOrder[0]).toBeLessThan(
				vi.mocked(icrc1Transfer).mock.invocationCallOrder[0]
			);
		});

		it('mints, records each step on the row and returns what was credited', async () => {
			await expect(mintCycles(params)).resolves.toEqual({
				status: 'minted',
				credited: 4_499_900_000_000n
			});

			expect(notifyMintCycles).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				blockIndex: 42n
			});
			expect(updateActiveUserTransaction).toHaveBeenNthCalledWith(1, {
				identity: mockIdentity,
				id: 'mint-1',
				status: { Executing: null },
				externalRefs: toCyclesMintExternalRefs({
					...displayRefs,
					[CYCLES_MINT_EXTERNAL_REF_KEYS.TRANSFER_BLOCK_INDEX]: '42'
				})
			});
			expect(updateActiveUserTransaction).toHaveBeenNthCalledWith(2, {
				identity: mockIdentity,
				id: 'mint-1',
				status: { Succeeded: null },
				externalRefs: toCyclesMintExternalRefs({
					...displayRefs,
					[CYCLES_MINT_EXTERNAL_REF_KEYS.TRANSFER_BLOCK_INDEX]: '42',
					[CYCLES_MINT_EXTERNAL_REF_KEYS.OUTCOME]: 'minted',
					[CYCLES_MINT_EXTERNAL_REF_KEYS.CREDITED_AMOUNT]: '4.4999'
				})
			});
			expect(progress.mock.calls).toEqual([
				[ProgressStepsCyclesMint.TRANSFER],
				[ProgressStepsCyclesMint.MINT]
			]);
		});

		// The terminal event is the Active transactions loader's, once per row.
		it('reports the mint as executing, and leaves its outcome to the row', async () => {
			await mintCycles(params);

			expect(trackCyclesMint).toHaveBeenCalledExactlyOnceWith({
				step: 'mint',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.EXECUTING,
				sourceSymbol: 'ICP',
				sourceAmount: '1.5',
				sourceUsdValue: '4.5',
				destinationSymbol: 'TCYCLES',
				destinationAmount: '4.4999'
			});
			expect(JSON.stringify(vi.mocked(trackCyclesMint).mock.calls)).not.toContain(
				mockPrincipal.toText()
			);
		});

		it('returns a refund and closes the row as failed', async () => {
			vi.mocked(notifyMintCycles).mockRejectedValue(new CmcNotifyRefundedError(43n, 'limit'));

			await expect(mintCycles(params)).resolves.toEqual({
				status: 'refunded',
				reason: 'limit',
				refundBlockIndex: 43n
			});

			expect(updateActiveUserTransaction).toHaveBeenLastCalledWith(
				expect.objectContaining({ status: { Failed: null }, error: 'limit' })
			);
		});

		it('notifies again while the CMC is still processing', async () => {
			vi.mocked(notifyMintCycles)
				.mockRejectedValueOnce(new CmcNotifyProcessingError())
				.mockResolvedValue(success);

			await expect(mintCycles(params)).resolves.toEqual(
				expect.objectContaining({ status: 'minted' })
			);

			expect(notifyMintCycles).toHaveBeenCalledTimes(2);
			expect(waitForMilliseconds).toHaveBeenCalledOnce();
		});

		// The ICP is in the CMC's custody: never reported as failed, finished in the background.
		it('hands a mint the CMC has not answered to the background', async () => {
			vi.mocked(notifyMintCycles).mockRejectedValue(new CmcNotifyProcessingError());

			await expect(mintCycles(params)).resolves.toEqual({ status: 'pending' });

			expect(notifyMintCycles).toHaveBeenCalledTimes(CYCLES_MINT_NOTIFY_ATTEMPTS);
			expect(updateActiveUserTransaction).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ status: { Executing: null } })
			);
		});

		// The ICP has moved: ending the mint over a bookkeeping write would be worse.
		it('keeps minting when a row write fails', async () => {
			vi.mocked(updateActiveUserTransaction).mockRejectedValue(new Error('backend'));

			await expect(mintCycles(params)).resolves.toEqual(
				expect.objectContaining({ status: 'minted' })
			);
		});

		// Fail-closed: without the row, a closed tab would strand the ICP.
		it('does not start when the row cannot be opened', async () => {
			vi.mocked(createActiveUserTransaction).mockRejectedValue(new Error('cap reached'));

			await expect(errorKind()).resolves.toBe('not_trackable');

			expect(icrc1Transfer).not.toHaveBeenCalled();
			expect(trackCyclesMint).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
					errorCode: 'not_trackable'
				})
			);
		});

		// What bounds when the transfer can still land, so when the poller may delete the row.
		it('abandons a mint whose tab was suspended before sending', async () => {
			vi.mocked(createActiveUserTransaction).mockImplementation(() => {
				vi.setSystemTime(NOW_MS + Number(CYCLES_MINT_TRANSFER_START_WINDOW_NS / 1_000_000n) + 1);

				return Promise.resolve();
			});

			await expect(errorKind()).resolves.toBe('timed_out');

			expect(icrc1Transfer).not.toHaveBeenCalled();
			expect(deleteActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				id: 'mint-1'
			});
		});

		it('deletes the row when the ledger refuses the transfer: nothing moved', async () => {
			vi.mocked(icrc1Transfer).mockRejectedValue(new InsufficientFundsError(ZERO));

			await expect(errorKind()).resolves.toBe('transfer_failed');

			expect(deleteActiveUserTransaction).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				id: 'mint-1'
			});
			expect(notifyMintCycles).not.toHaveBeenCalled();
			expect(trackCyclesMint).toHaveBeenLastCalledWith(
				expect.objectContaining({ errorCode: 'transfer_failed' })
			);
		});

		// The transfer may have landed: the poller looks it up and finishes or deletes the row.
		it('keeps the row when the transfer gets no answer', async () => {
			vi.mocked(icrc1Transfer).mockRejectedValue(new Error('Network error'));

			await expect(errorKind()).resolves.toBe('unconfirmed');

			expect(deleteActiveUserTransaction).not.toHaveBeenCalled();
			expect(updateActiveUserTransaction).not.toHaveBeenCalled();
			expect(notifyMintCycles).not.toHaveBeenCalled();
		});
	});
});
