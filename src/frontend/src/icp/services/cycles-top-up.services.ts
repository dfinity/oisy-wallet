import { withdrawCycles } from '$icp/api/cycles-ledger.api';
import {
	CyclesLedgerWithdrawDuplicateError,
	CyclesLedgerWithdrawFailedError,
	CyclesLedgerWithdrawRefusedError
} from '$icp/canisters/cycles-ledger.errors';
import type { CyclesTopUpResult } from '$icp/types/cycles-top-up';
import type { NullishIdentity } from '$lib/types/identity';
import { consoleError } from '$lib/utils/console.utils';
import { assertNonNullish, nonNullish } from '@dfinity/utils';
import type { Principal } from '@icp-sdk/core/principal';

/**
 * Tops up a canister with cycles from the caller's TCYCLES balance, in one cycles-ledger
 * call.
 *
 * Sending the same top-up again must reuse its `createdAt`: the ledger then answers with
 * the block of the first one instead of running it twice, which counts as `topped_up`.
 */
export const topUpCanister = async ({
	identity,
	canisterId,
	amount,
	createdAt
}: {
	identity: NullishIdentity;
	canisterId: Principal;
	// In cycles, without the ledger fee.
	amount: bigint;
	createdAt: bigint;
}): Promise<CyclesTopUpResult> => {
	assertNonNullish(identity);

	try {
		const blockIndex = await withdrawCycles({ identity, to: canisterId, amount, createdAt });

		return { status: 'topped_up', blockIndex };
	} catch (err: unknown) {
		if (err instanceof CyclesLedgerWithdrawDuplicateError) {
			return { status: 'topped_up', blockIndex: err.duplicateOf };
		}

		if (err instanceof CyclesLedgerWithdrawFailedError) {
			return {
				status: 'refunded',
				...(nonNullish(err.refundBlockIndex) && { refundBlockIndex: err.refundBlockIndex })
			};
		}

		if (err instanceof CyclesLedgerWithdrawRefusedError) {
			return { status: 'refused', refusal: err.refusal };
		}

		// The ledger did not answer, so the top-up may have gone through.
		consoleError(err);

		return { status: 'unknown' };
	}
};
