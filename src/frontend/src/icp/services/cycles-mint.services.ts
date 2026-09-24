import { ICP_LEDGER_CANISTER_ID } from '$env/networks/networks.icp.env';
import { notifyMintCycles } from '$icp/api/cmc.api';
import { icrc1Transfer } from '$icp/api/icp-ledger.api';
import { CmcNotifyError, CmcNotifyRefundedError } from '$icp/canisters/cmc.errors';
import { CMC_MINT_CYCLES_MEMO } from '$icp/constants/cmc.constants';
import type { CyclesMintNotifyResult } from '$icp/types/cycles-mint';
import { getCyclesMintDepositAccount } from '$icp/utils/cycles-mint.utils';
import type { NullishIdentity } from '$lib/types/identity';
import { assertNonNullish, nonNullish } from '@dfinity/utils';
import { TxDuplicateError } from '@icp-sdk/canisters/ledger/icp';

/**
 * Sends the ICP of a mint to the CMC's deposit account for the caller.
 *
 * `createdAt` stays the same for the whole mint, so sending again after a call
 * that got no answer cannot pay twice: the ledger recognises the transfer and
 * answers with the block the first one landed in.
 */
export const transferIcpForCyclesMint = async ({
	identity,
	amount,
	createdAt
}: {
	identity: NullishIdentity;
	amount: bigint;
	createdAt: bigint;
}): Promise<bigint> => {
	assertNonNullish(identity);

	try {
		return await icrc1Transfer({
			identity,
			to: getCyclesMintDepositAccount(identity.getPrincipal()),
			amount,
			createdAt,
			memo: CMC_MINT_CYCLES_MEMO,
			ledgerCanisterId: ICP_LEDGER_CANISTER_ID
		});
	} catch (err: unknown) {
		if (err instanceof TxDuplicateError) {
			return err.duplicateOf;
		}

		throw err;
	}
};

/**
 * Notifies the CMC of a mint deposit once, and reports where the mint stands.
 *
 * Only a refund and the CMC's other final answers end a mint. `Processing`, a
 * transient CMC error and a call that got no answer all leave it `pending`:
 * the ICP has left the wallet, so the mint must not be reported as failed
 * while notifying again can still complete it.
 */
export const notifyCyclesMint = async ({
	identity,
	blockIndex
}: {
	identity: NullishIdentity;
	blockIndex: bigint;
}): Promise<CyclesMintNotifyResult> => {
	assertNonNullish(identity);

	try {
		const { minted, balance } = await notifyMintCycles({ identity, blockIndex });

		return { status: 'minted', minted, balance };
	} catch (err: unknown) {
		if (err instanceof CmcNotifyRefundedError) {
			return {
				status: 'refunded',
				reason: err.message,
				...(nonNullish(err.refundBlockIndex) && { refundBlockIndex: err.refundBlockIndex })
			};
		}

		if (err instanceof CmcNotifyError && !err.retryable) {
			return { status: 'failed', reason: err.message };
		}

		return { status: 'pending' };
	}
};
