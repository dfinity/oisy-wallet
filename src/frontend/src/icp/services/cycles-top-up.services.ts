import { notifyTopUp } from '$icp/api/cmc.api';
import { withdrawCycles } from '$icp/api/cycles-ledger.api';
import { getTransactions } from '$icp/api/icrc-index-ng.api';
import {
	CyclesLedgerWithdrawDuplicateError,
	CyclesLedgerWithdrawFailedError,
	CyclesLedgerWithdrawRefusedError
} from '$icp/canisters/cycles-ledger.errors';
import { CMC_TOP_UP_MEMO, CYCLES_LEDGER_DEPOSIT_FEE } from '$icp/constants/cmc.constants';
import { transferIcpToCmc } from '$icp/services/cmc.services';
import type { IndexCanisterIdText } from '$icp/types/canister';
import type { CyclesTopUpNotifyResult, CyclesTopUpResult } from '$icp/types/cycles-top-up';
import { getCmcDepositAccount, toCmcNotifyFailure } from '$icp/utils/cmc.utils';
import { isTopUpRefundMemo } from '$icp/utils/cycles-ledger.utils';
import type { NullishIdentity } from '$lib/types/identity';
import { consoleError } from '$lib/utils/console.utils';
import {
	assertNonNullish,
	fromNullable,
	fromNullishNullable,
	isNullish,
	nonNullish
} from '@dfinity/utils';
import type { IcrcIndexDid } from '@icp-sdk/canisters/ledger/icrc';
import type { Identity } from '@icp-sdk/core/agent';
import type { Principal } from '@icp-sdk/core/principal';

// How many of the caller's newest transactions are searched for a resent top-up's first
// burn. A burn further back, or not indexed yet, leaves the outcome unknown.
const DUPLICATE_LOOKUP_TRANSACTIONS = 100n;

/**
 * Tops up a canister with cycles from the caller's TCYCLES balance, in one cycles-ledger
 * call.
 *
 * Sending the same top-up again must reuse its `createdAt`: the ledger then answers with
 * the burn of the first one instead of running it twice. That burn may have been refunded,
 * so its outcome is read from the caller's transactions on `indexCanisterId`, and stays
 * unknown without one.
 */
export const topUpCanister = async ({
	identity,
	canisterId,
	amount,
	createdAt,
	indexCanisterId
}: {
	identity: NullishIdentity;
	canisterId: Principal;
	// In cycles, without the ledger fee.
	amount: bigint;
	createdAt: bigint;
	indexCanisterId?: IndexCanisterIdText;
}): Promise<CyclesTopUpResult> => {
	assertNonNullish(identity);

	try {
		const blockIndex = await withdrawCycles({ identity, to: canisterId, amount, createdAt });

		return { status: 'topped_up', blockIndex };
	} catch (err: unknown) {
		if (err instanceof CyclesLedgerWithdrawDuplicateError) {
			if (isNullish(indexCanisterId)) {
				return { status: 'unknown' };
			}

			return await duplicateOutcome({
				identity,
				indexCanisterId,
				burnIndex: err.duplicateOf,
				amount
			});
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

/**
 * How the earlier top-up that burned at `burnIndex` ended. A failed deposit keeps the burn
 * and refunds the amount minus the fee in a separate mint after it, with the refund memo.
 */
const duplicateOutcome = async ({
	identity,
	indexCanisterId,
	burnIndex,
	amount
}: {
	identity: Identity;
	indexCanisterId: IndexCanisterIdText;
	burnIndex: bigint;
	amount: bigint;
}): Promise<CyclesTopUpResult> => {
	try {
		const { transactions } = await getTransactions({
			identity,
			owner: identity.getPrincipal(),
			indexCanisterId,
			maxResults: DUPLICATE_LOOKUP_TRANSACTIONS
		});

		if (!transactions.some(({ id }) => id === burnIndex)) {
			return { status: 'unknown' };
		}

		const refundBlockIndex = findRefund({ transactions, burnIndex, amount });

		return nonNullish(refundBlockIndex)
			? { status: 'refunded', refundBlockIndex }
			: { status: 'topped_up', blockIndex: burnIndex };
	} catch (err: unknown) {
		consoleError(err);

		return { status: 'unknown' };
	}
};

// The first refund of the amount after the burn is its refund, unless another burn of the
// same amount comes first: a refund after that one is more likely that one's.
const findRefund = ({
	transactions,
	burnIndex,
	amount
}: {
	transactions: IcrcIndexDid.TransactionWithId[];
	burnIndex: bigint;
	amount: bigint;
}): bigint | undefined => {
	const refundAmount = amount - CYCLES_LEDGER_DEPOSIT_FEE;

	const later = transactions
		.filter(({ id }) => id > burnIndex)
		.sort(({ id: a }, { id: b }) => (a < b ? -1 : 1));

	for (const {
		id,
		transaction: { burn, mint }
	} of later) {
		if (fromNullable(burn)?.amount === amount) {
			return undefined;
		}

		const minted = fromNullable(mint);

		if (minted?.amount === refundAmount && isTopUpRefundMemo(fromNullishNullable(minted.memo))) {
			return id;
		}
	}

	return undefined;
};

/**
 * Sends the ICP of a top-up to the CMC's deposit account for the canister. `createdAt`
 * stays the same for the whole top-up (see `transferIcpToCmc`).
 */
export const transferIcpForCyclesTopUp = async ({
	identity,
	canisterId,
	amount,
	createdAt
}: {
	identity: NullishIdentity;
	canisterId: Principal;
	// ICP e8s, without the ledger fee.
	amount: bigint;
	createdAt: bigint;
}): Promise<bigint> => {
	assertNonNullish(identity);

	return await transferIcpToCmc({
		identity,
		to: getCmcDepositAccount(canisterId),
		memo: CMC_TOP_UP_MEMO,
		amount,
		createdAt
	});
};

/**
 * Notifies the CMC of a top-up deposit once, and reports where the top-up stands. Only a
 * refund and the CMC's other final answers end it (see `toCmcNotifyFailure`).
 */
export const notifyCyclesTopUp = async ({
	identity,
	blockIndex,
	canisterId
}: {
	identity: NullishIdentity;
	blockIndex: bigint;
	canisterId: Principal;
}): Promise<CyclesTopUpNotifyResult> => {
	assertNonNullish(identity);

	try {
		const cycles = await notifyTopUp({ identity, blockIndex, to: canisterId });

		return { status: 'topped_up', cycles };
	} catch (err: unknown) {
		return toCmcNotifyFailure(err);
	}
};
