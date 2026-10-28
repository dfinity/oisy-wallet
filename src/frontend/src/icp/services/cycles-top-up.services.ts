import type { ActiveUserTransactionStatus } from '$declarations/backend/backend.did';
import { notifyTopUp } from '$icp/api/cmc.api';
import { withdrawCycles } from '$icp/api/cycles-ledger.api';
import { getTransactions } from '$icp/api/icrc-index-ng.api';
import {
	CyclesLedgerWithdrawDuplicateError,
	CyclesLedgerWithdrawFailedError,
	CyclesLedgerWithdrawRefusedError
} from '$icp/canisters/cycles-ledger.errors';
import {
	CMC_NOTIFY_ATTEMPTS,
	CMC_NOTIFY_RETRY_DELAY_MILLIS,
	CMC_ROW_DELETE_ATTEMPTS,
	CMC_ROW_DELETE_RETRY_DELAY_MILLIS,
	CMC_TOP_UP_MEMO,
	CMC_TRANSFER_START_WINDOW_NS,
	CYCLES_LEDGER_DEPOSIT_FEE
} from '$icp/constants/cmc.constants';
import { transferIcpToCmc } from '$icp/services/cmc.services';
import type { IndexCanisterIdText } from '$icp/types/canister';
import {
	CyclesTopUpIcpError,
	type CyclesTopUpNotifyResult,
	type CyclesTopUpResult
} from '$icp/types/cycles-top-up';
import { getCmcDepositAccount, toCmcNotifyFailure } from '$icp/utils/cmc.utils';
import { isTopUpRefundMemo } from '$icp/utils/cycles-ledger.utils';
import { randomSubMillisecondNs } from '$icp/utils/cycles-mint.utils';
import {
	PLAUSIBLE_EVENT_RESULT_STATUSES,
	PLAUSIBLE_EVENT_SOURCE_LOCATIONS
} from '$lib/enums/plausible';
import { ProgressStepsCyclesTopUp } from '$lib/enums/progress-steps';
import {
	createActiveUserTransaction,
	deleteActiveUserTransaction,
	updateActiveUserTransaction
} from '$lib/services/active-user-transactions.services';
import {
	trackCyclesTopUp,
	type CyclesTopUpErrorCode,
	type TrackCyclesTopUpParams
} from '$lib/services/cycles-top-up-analytics.services';
import {
	CYCLES_TOP_UP_EXTERNAL_REF_KEYS,
	type CyclesTopUpExternalRefKey
} from '$lib/types/cycles-top-up-active-tx';
import type { NullishIdentity } from '$lib/types/identity';
import type { Token } from '$lib/types/token';
import { consoleError } from '$lib/utils/console.utils';
import {
	toCyclesTopUpData,
	toCyclesTopUpDisplayRefs,
	toCyclesTopUpExternalRefs,
	toCyclesTopUpRowUpdate
} from '$lib/utils/cycles-top-up-active-tx.utils';
import { formatToken } from '$lib/utils/format.utils';
import { waitForMilliseconds } from '$lib/utils/timeout.utils';
import {
	assertNonNullish,
	fromNullable,
	fromNullishNullable,
	isNullish,
	nonNullish,
	nowInBigIntNanoSeconds
} from '@dfinity/utils';
import { IcrcError } from '@icp-sdk/canisters/ledger/icp';
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

/**
 * Tops up a canister with ICP: records the top-up, sends the ICP to the CMC and notifies it.
 *
 * The top-up is an active user transaction, and its row is the recovery record: the ICP
 * ledger keeps only a hash of the canister's deposit account, so the row is the one place
 * that keeps the canister, and a closed tab must leave something for the next session to
 * finish. That is why the row opens before anything moves, and why this fails closed when it
 * cannot (spec §6).
 *
 * The outcome the modal shows is returned. The terminal analytics and the wallet refresh are
 * left to the Active transactions loader, which fires them once per row, whichever session
 * closes it.
 */
export const topUpCanisterWithIcp = async ({
	identity,
	topUpId,
	sourceToken,
	canisterId,
	amount,
	usdSourceValue,
	progress
}: {
	identity: Identity;
	// The row's id, generated by the caller.
	topUpId: string;
	// ICP.
	sourceToken: Token;
	canisterId: Principal;
	// ICP e8s, without the ledger fee.
	amount: bigint;
	usdSourceValue?: string;
	progress: (step: ProgressStepsCyclesTopUp) => void;
}): Promise<CyclesTopUpNotifyResult> => {
	const sourceAmount = formatToken({
		value: amount,
		unitName: sourceToken.decimals,
		displayDecimals: sourceToken.decimals
	});

	// Only the navigation pays with ICP.
	const analytics: Omit<TrackCyclesTopUpParams, 'resultStatus'> = {
		step: 'top_up',
		tokenSymbol: sourceToken.symbol,
		sourceLocation: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.NAVIGATION
	};

	const fail = (
		errorCode: CyclesTopUpErrorCode & CyclesTopUpIcpError['kind']
	): CyclesTopUpIcpError => {
		trackCyclesTopUp({
			...analytics,
			resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
			errorCode
		});

		return new CyclesTopUpIcpError(errorCode);
	};

	// Fixed for the whole top-up, as for a mint: stored in the row, it lets the ledger
	// deduplicate a resent transfer and lets a later session find the deposit again.
	const transferCreatedAtNs = nowInBigIntNanoSeconds() + randomSubMillisecondNs();

	const data = toCyclesTopUpData({ sourceToken, canisterId, amount, transferCreatedAtNs });

	if (isNullish(data)) {
		throw fail('not_trackable');
	}

	let refs: Partial<Record<CyclesTopUpExternalRefKey, string>> = toCyclesTopUpDisplayRefs({
		sourceToken,
		amount: sourceAmount,
		usdSourceValue
	});

	// Best-effort, for a row whose top-up never sent anything, as in `mintCycles`: whether
	// the row is gone is returned, so that the modal only reports an ending the row will not.
	const deleteRow = async (): Promise<boolean> => {
		for (let attempt = 1; attempt <= CMC_ROW_DELETE_ATTEMPTS; attempt++) {
			try {
				await deleteActiveUserTransaction({ identity, id: topUpId });

				return true;
			} catch (err: unknown) {
				consoleError(err);
			}

			if (attempt < CMC_ROW_DELETE_ATTEMPTS) {
				await waitForMilliseconds(CMC_ROW_DELETE_RETRY_DELAY_MILLIS);
			}
		}

		return false;
	};

	try {
		await createActiveUserTransaction({
			identity,
			id: topUpId,
			data,
			externalRefs: toCyclesTopUpExternalRefs(refs)
		});
	} catch (err: unknown) {
		consoleError(err);

		// The backend may have committed the row all the same, if only its answer was lost.
		throw (await deleteRow()) ? fail('not_trackable') : new CyclesTopUpIcpError('not_trackable');
	}

	// Learned refs ride with the status they belong to, and a failed write is swallowed: the
	// ICP has already moved, and the poller re-derives everything from the deposit. Every write
	// repeats the highest status reached so far.
	let rowStatus: ActiveUserTransactionStatus | undefined;

	const advanceRow = async ({
		status,
		error,
		learned = {}
	}: {
		status?: ActiveUserTransactionStatus;
		error?: string;
		learned?: Partial<Record<CyclesTopUpExternalRefKey, string>>;
	}): Promise<void> => {
		refs = { ...refs, ...learned };
		rowStatus = status ?? rowStatus;

		try {
			await updateActiveUserTransaction({
				identity,
				id: topUpId,
				...(nonNullish(rowStatus) && { status: rowStatus }),
				...(nonNullish(error) && { error }),
				externalRefs: toCyclesTopUpExternalRefs(refs)
			});
		} catch (err: unknown) {
			consoleError(err);
		}
	};

	// What bounds when this transfer can still land, and so when the poller may conclude it
	// never will: a transfer is only ever sent within this window of its timestamp.
	if (nowInBigIntNanoSeconds() - transferCreatedAtNs > CMC_TRANSFER_START_WINDOW_NS) {
		throw (await deleteRow()) ? fail('timed_out') : new CyclesTopUpIcpError('timed_out');
	}

	trackCyclesTopUp({ ...analytics, resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.EXECUTING });

	progress(ProgressStepsCyclesTopUp.TRANSFER);

	let blockIndex: bigint;

	try {
		blockIndex = await transferIcpForCyclesTopUp({
			identity,
			canisterId,
			amount,
			createdAt: transferCreatedAtNs
		});
	} catch (err: unknown) {
		consoleError(err);

		// The ledger answered and refused: nothing moved.
		if (err instanceof IcrcError) {
			throw (await deleteRow())
				? fail('transfer_failed')
				: new CyclesTopUpIcpError('transfer_failed');
		}

		// No answer, so the transfer may have landed. The row stays `Pending` without a deposit,
		// which the poller resolves from the ICP history: it finishes the top-up, or closes the
		// row as never sent once the ICP index has synced past its landing.
		throw new CyclesTopUpIcpError('unconfirmed');
	}

	// The ICP is in the CMC's custody from here on, which is what `Executing` records.
	await advanceRow({
		status: { Executing: null },
		learned: { [CYCLES_TOP_UP_EXTERNAL_REF_KEYS.TRANSFER_BLOCK_INDEX]: `${blockIndex}` }
	});

	progress(ProgressStepsCyclesTopUp.TOP_UP);

	for (let attempt = 1; attempt <= CMC_NOTIFY_ATTEMPTS; attempt++) {
		const result = await notifyCyclesTopUp({ identity, blockIndex, canisterId });

		const update = toCyclesTopUpRowUpdate(result);

		if (nonNullish(update)) {
			await advanceRow(update);

			return result;
		}

		if (attempt < CMC_NOTIFY_ATTEMPTS) {
			await waitForMilliseconds(CMC_NOTIFY_RETRY_DELAY_MILLIS);
		}
	}

	return { status: 'pending' };
};
