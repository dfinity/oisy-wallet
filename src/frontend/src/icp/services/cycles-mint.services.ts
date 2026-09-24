import type { ActiveUserTransactionStatus } from '$declarations/backend/backend.did';
import { ICP_LEDGER_CANISTER_ID } from '$env/networks/networks.icp.env';
import { notifyMintCycles } from '$icp/api/cmc.api';
import { icrc1Transfer } from '$icp/api/icp-ledger.api';
import { CmcNotifyError, CmcNotifyRefundedError } from '$icp/canisters/cmc.errors';
import {
	CMC_MINT_CYCLES_MEMO,
	CYCLES_LEDGER_DECIMALS,
	CYCLES_MINT_NOTIFY_ATTEMPTS,
	CYCLES_MINT_NOTIFY_RETRY_DELAY_MILLIS,
	CYCLES_MINT_TRANSFER_START_WINDOW_NS
} from '$icp/constants/cmc.constants';
import { CyclesMintError, type CyclesMintNotifyResult } from '$icp/types/cycles-mint';
import { getCyclesMintDepositAccount } from '$icp/utils/cycles-mint.utils';
import { PLAUSIBLE_EVENT_RESULT_STATUSES } from '$lib/enums/plausible';
import { ProgressStepsCyclesMint } from '$lib/enums/progress-steps';
import {
	createActiveUserTransaction,
	deleteActiveUserTransaction,
	updateActiveUserTransaction
} from '$lib/services/active-user-transactions.services';
import {
	trackCyclesMint,
	type CyclesMintErrorCode,
	type TrackCyclesMintParams
} from '$lib/services/cycles-mint-analytics.services';
import {
	CYCLES_MINT_EXTERNAL_REF_KEYS,
	type CyclesMintExternalRefKey
} from '$lib/types/cycles-mint-active-tx';
import type { NullishIdentity } from '$lib/types/identity';
import type { Token } from '$lib/types/token';
import { consoleError } from '$lib/utils/console.utils';
import {
	toCyclesMintCredited,
	toCyclesMintData,
	toCyclesMintDisplayRefs,
	toCyclesMintExternalRefs,
	toCyclesMintRowUpdate
} from '$lib/utils/cycles-mint-active-tx.utils';
import { formatToken } from '$lib/utils/format.utils';
import { waitForMilliseconds } from '$lib/utils/timeout.utils';
import { assertNonNullish, isNullish, nonNullish, nowInBigIntNanoSeconds } from '@dfinity/utils';
import { IcrcError, TxDuplicateError } from '@icp-sdk/canisters/ledger/icp';
import type { Identity } from '@icp-sdk/core/agent';

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

// How a mint ended in the modal. `minted` carries what the cycles ledger credited;
// `pending` means the CMC has not answered yet and the mint finishes in the background.
export type CyclesMintResult =
	{ status: 'minted'; credited: bigint } | Exclude<CyclesMintNotifyResult, { status: 'minted' }>;

/**
 * Mints TCYCLES from ICP: records the mint, sends the ICP to the CMC and notifies it.
 *
 * The mint is an active user transaction, and its row is the recovery record: once the
 * ICP sits in the CMC's custody only a notify from this principal mints it, so a closed
 * tab must leave something for the next session to finish. That is why the row opens
 * before anything moves and why this fails closed when it cannot (spec §6).
 *
 * The outcome the modal shows is returned. The terminal analytics and the wallet refresh
 * are left to the Active transactions loader, which fires them once per row, whichever
 * session closes it.
 */
export const mintCycles = async ({
	identity,
	mintId,
	sourceToken,
	destinationToken,
	amount,
	estimatedCredited,
	usdSourceValue,
	progress
}: {
	identity: Identity;
	// The row's id, generated by the caller.
	mintId: string;
	sourceToken: Token;
	destinationToken: Token;
	// ICP e8s, without the ledger fee.
	amount: bigint;
	// The estimate the user reviewed, for the analytics only.
	estimatedCredited?: bigint;
	usdSourceValue?: string;
	progress: (step: ProgressStepsCyclesMint) => void;
}): Promise<CyclesMintResult> => {
	const sourceAmount = formatToken({
		value: amount,
		unitName: sourceToken.decimals,
		displayDecimals: sourceToken.decimals
	});

	const analytics: Omit<TrackCyclesMintParams, 'resultStatus'> = {
		step: 'mint',
		sourceSymbol: sourceToken.symbol,
		sourceAmount,
		sourceUsdValue: usdSourceValue,
		destinationSymbol: destinationToken.symbol,
		...(nonNullish(estimatedCredited) && {
			destinationAmount: formatToken({
				value: estimatedCredited,
				unitName: CYCLES_LEDGER_DECIMALS,
				displayDecimals: CYCLES_LEDGER_DECIMALS
			})
		})
	};

	const fail = (errorCode: CyclesMintErrorCode & CyclesMintError['kind']): CyclesMintError => {
		trackCyclesMint({
			...analytics,
			resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
			errorCode
		});

		return new CyclesMintError(errorCode);
	};

	// Fixed for the whole mint: stored in the row, it lets the ledger deduplicate a resent
	// transfer and lets a later session find the deposit again.
	const transferCreatedAtNs = nowInBigIntNanoSeconds();

	const data = toCyclesMintData({ sourceToken, destinationToken, amount, transferCreatedAtNs });

	if (isNullish(data)) {
		throw fail('not_trackable');
	}

	let refs: Partial<Record<CyclesMintExternalRefKey, string>> = toCyclesMintDisplayRefs({
		sourceToken,
		destinationToken,
		amount: sourceAmount,
		usdSourceValue
	});

	try {
		await createActiveUserTransaction({
			identity,
			id: mintId,
			data,
			externalRefs: toCyclesMintExternalRefs(refs)
		});
	} catch (err: unknown) {
		consoleError(err);

		throw fail('not_trackable');
	}

	// Best-effort, for a row whose mint never sent anything: a delete that fails leaves the
	// row `Pending` without a deposit, which the poller deletes once the transfer can no
	// longer land.
	const deleteRow = async () => {
		try {
			await deleteActiveUserTransaction({ identity, id: mintId });
		} catch (err: unknown) {
			consoleError(err);
		}
	};

	// Learned refs ride with the status they belong to, and a failed write is swallowed:
	// the ICP has already moved, and the poller re-derives everything from the deposit. As
	// in `fetchOisyTradeSwap`, every write repeats the highest status reached so far, so a
	// lost `Executing` write is repaired by the next one.
	let rowStatus: ActiveUserTransactionStatus | undefined;

	const advanceRow = async ({
		status,
		error,
		learned = {}
	}: {
		status?: ActiveUserTransactionStatus;
		error?: string;
		learned?: Partial<Record<CyclesMintExternalRefKey, string>>;
	}): Promise<void> => {
		refs = { ...refs, ...learned };
		rowStatus = status ?? rowStatus;

		try {
			await updateActiveUserTransaction({
				identity,
				id: mintId,
				...(nonNullish(rowStatus) && { status: rowStatus }),
				...(nonNullish(error) && { error }),
				externalRefs: toCyclesMintExternalRefs(refs)
			});
		} catch (err: unknown) {
			consoleError(err);
		}
	};

	// What bounds when this transfer can still land, and so when the poller may conclude
	// it never will: a transfer is only ever sent within this window of its timestamp.
	if (nowInBigIntNanoSeconds() - transferCreatedAtNs > CYCLES_MINT_TRANSFER_START_WINDOW_NS) {
		await deleteRow();

		throw fail('timed_out');
	}

	trackCyclesMint({ ...analytics, resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.EXECUTING });

	progress(ProgressStepsCyclesMint.TRANSFER);

	let blockIndex: bigint;

	try {
		blockIndex = await transferIcpForCyclesMint({
			identity,
			amount,
			createdAt: transferCreatedAtNs
		});
	} catch (err: unknown) {
		consoleError(err);

		// The ledger answered and refused: nothing moved.
		if (err instanceof IcrcError) {
			await deleteRow();

			throw fail('transfer_failed');
		}

		// No answer, so the transfer may have landed. The row stays `Pending` without a
		// deposit, which the poller resolves from the ICP history: it finishes the mint, or
		// deletes the row once the transfer can no longer land.
		throw new CyclesMintError('unconfirmed');
	}

	// The ICP is in the CMC's custody from here on, which is what `Executing` records.
	await advanceRow({
		status: { Executing: null },
		learned: { [CYCLES_MINT_EXTERNAL_REF_KEYS.TRANSFER_BLOCK_INDEX]: `${blockIndex}` }
	});

	progress(ProgressStepsCyclesMint.MINT);

	for (let attempt = 1; attempt <= CYCLES_MINT_NOTIFY_ATTEMPTS; attempt++) {
		const result = await notifyCyclesMint({ identity, blockIndex });

		const update = toCyclesMintRowUpdate(result);

		if (nonNullish(update)) {
			await advanceRow(update);

			return result.status === 'minted'
				? { status: 'minted', credited: toCyclesMintCredited(result.minted) }
				: result;
		}

		if (attempt < CYCLES_MINT_NOTIFY_ATTEMPTS) {
			await waitForMilliseconds(CYCLES_MINT_NOTIFY_RETRY_DELAY_MILLIS);
		}
	}

	return { status: 'pending' };
};
