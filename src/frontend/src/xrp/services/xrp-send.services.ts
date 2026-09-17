import { ProgressStepsSendXrp } from '$lib/enums/progress-steps';
import type { NullishIdentity } from '$lib/types/identity';
import { randomWait } from '$lib/utils/time.utils';
import {
	XRP_CONFIRM_MAX_ATTEMPTS,
	XRP_LAST_LEDGER_SEQUENCE_OFFSET,
	XRP_MAX_FEE_DROPS
} from '$xrp/constants/xrp.constants';
import {
	loadXrpAccountInfo,
	loadXrpLedgerIndex,
	loadXrpTransactionOutcome,
	loadXrpValidatedLedgerIndex,
	submitXrpTransaction
} from '$xrp/rest/xrpl.rest';
import { getXrpSigningPublicKey, signXrpTransaction } from '$xrp/services/xrp-sign.services';
import type { XrpAddress } from '$xrp/types/address';
import type { XrpNetworkType } from '$xrp/types/network';
import type { XrpBalance } from '$xrp/types/xrp-balance';
import { XrpTransactionFailedError } from '$xrp/types/xrp-send';
import type { XrpSendResult, XrpSubmitResult } from '$xrp/types/xrp-transaction';
import {
	buildXrpPayment,
	deriveXrpTransactionHash,
	isXrpSubmitAccepted,
	isXrpTransactionSuccessful
} from '$xrp/utils/xrp-transaction.utils';
import { nonNullish } from '@dfinity/utils';

/**
 * Waits for a submitted transaction to be validated, and reports its final result.
 *
 * A transaction is only definitively failed once the ledger has advanced past the
 * `LastLedgerSequence` it was signed with: until then it can still be included. Giving up
 * earlier would report a failure for a payment that may yet validate, and invite the user
 * to send a duplicate — a real risk for a `terQUEUED` submission, which waits for a later
 * ledger by definition. So this polls to that expiry rather than to a fixed retry budget.
 */
const confirmXrpTransaction = async ({
	hash,
	network,
	lastLedgerSequence
}: {
	hash: string;
	network: XrpNetworkType;
	lastLedgerSequence: number;
}): Promise<string | undefined> => {
	// A lookup the node could not answer is not evidence of anything. While attempts remain it is
	// retried; what must never happen is concluding expiry from it, so the recheck below is
	// deliberately left to throw.
	const tryOutcome = async (): Promise<
		{ validated: boolean; transactionResult: string | undefined } | undefined
	> => {
		try {
			return await loadXrpTransactionOutcome({ hash, network });
		} catch (_: unknown) {
			return undefined;
		}
	};

	for (let attempt = 0; attempt < XRP_CONFIRM_MAX_ATTEMPTS; attempt++) {
		const outcome = await tryOutcome();

		if (outcome?.validated) {
			return outcome.transactionResult;
		}

		// Expiry is only evaluated on a lookup the node actually answered; an unanswered one
		// establishes nothing and simply costs an attempt.
		if (nonNullish(outcome)) {
			// The VALIDATED index, not the open one: the open ledger has already advanced past a
			// closed ledger whose transactions are not yet validated, so comparing against it would
			// declare expiry for a payment that is about to validate.
			const validatedLedgerIndex = await loadXrpValidatedLedgerIndex({ network });

			if (validatedLedgerIndex > lastLedgerSequence) {
				// The `tx` lookup above and this index come from two separate calls, so the lookup may
				// have missed a payment that validated in between. Expiry is only final if it survives
				// a recheck against the newer ledger state — otherwise a succeeded payment would be
				// reported as failed and the user invited to send a duplicate. This one is not caught:
				// a node that fails to answer here leaves non-inclusion unestablished, and the error
				// must surface instead of being turned into a claim that the payment never applied.
				const recheck = await loadXrpTransactionOutcome({ hash, network });

				if (recheck.validated) {
					return recheck.transactionResult;
				}

				// Past its LastLedgerSequence the transaction can never be applied, so this failure is
				// final — and, unlike an early timeout, sending again is safe.
				throw new Error(
					`XRP transaction expired: not included by ledger ${lastLedgerSequence}, so it can no longer be applied.`
				);
			}
		}

		await randomWait({});
	}

	throw new Error('XRP transaction confirmation stopped before its ledger expiry was reached.');
};

/**
 * Sends native XRP: fetches the account sequence, the open-ledger fee and the current
 * ledger index, builds and threshold-signs a Payment, submits it, and waits for the
 * transaction to be included in a validated ledger.
 *
 * `amount` is in drops. The caller is responsible for having already reserved the
 * account base and owner reserves out of the max amount (see `getXrpMaxAmount`).
 */
export const sendXrp = async ({
	identity,
	network,
	source,
	destination,
	amount,
	fee,
	destinationTag,
	progress
}: {
	identity: NullishIdentity;
	network: XrpNetworkType;
	source: XrpAddress;
	destination: XrpAddress;
	amount: XrpBalance;
	fee: XrpBalance;
	destinationTag?: number;
	progress?: (step: ProgressStepsSendXrp) => void;
}): Promise<XrpSendResult> => {
	progress?.(ProgressStepsSendXrp.INITIALIZATION);

	// `fee` is the figure the amount was priced and reviewed against, passed in rather than
	// re-fetched: signing a fresh estimate would sign a fee the user never saw and could push the
	// total past the balance even though the caller's sendability check passed.
	//
	// Still bounded here, since the value reaching this point is ultimately node-derived.
	if (fee > XRP_MAX_FEE_DROPS) {
		throw new Error(`XRP fee ${fee} drops exceeds the maximum of ${XRP_MAX_FEE_DROPS} drops.`);
	}

	const [{ sequence }, ledgerIndex, signingPublicKey] = await Promise.all([
		loadXrpAccountInfo({ address: source, network }),
		loadXrpLedgerIndex({ network }),
		getXrpSigningPublicKey({ identity, network })
	]);

	const lastLedgerSequence = ledgerIndex + XRP_LAST_LEDGER_SEQUENCE_OFFSET;

	const transaction = buildXrpPayment({
		account: source,
		destination,
		amount,
		fee,
		sequence,
		signingPublicKey,
		destinationTag,
		lastLedgerSequence
	});

	progress?.(ProgressStepsSendXrp.SIGN);
	const txBlob = await signXrpTransaction({ identity, network, transaction });

	// Derived from the blob, not read from the submit response: if that response is lost the node
	// may still have applied the transaction, and without a hash of our own there would be nothing
	// to poll — the send would be reported as failed and a retry would spend the funds again.
	const txHash = await deriveXrpTransactionHash(txBlob);

	progress?.(ProgressStepsSendXrp.SEND);

	let result: XrpSubmitResult | undefined;

	try {
		result = await submitXrpTransaction({ txBlob, network });
	} catch (_: unknown) {
		// Ambiguous: a transport or shape failure says nothing about whether the node applied the
		// blob, so fall through to confirmation rather than declaring failure here.
	}

	// A response we did understand is authoritative: a non-accepted engine result is a
	// deterministic rejection, so it fails immediately.
	if (nonNullish(result) && !isXrpSubmitAccepted(result)) {
		throw new Error(
			`XRP transaction rejected: ${result.engineResult}${
				result.engineResultMessage ? ` (${result.engineResultMessage})` : ''
			}`
		);
	}

	progress?.(ProgressStepsSendXrp.CONFIRM);

	const transactionResult = await confirmXrpTransaction({
		hash: txHash,
		network,
		lastLedgerSequence
	});

	// Typed so the caller can tell this apart from an indeterminate confirmation: the ledger
	// validated the transaction and it failed, claiming the fee.
	if (!isXrpTransactionSuccessful(transactionResult)) {
		throw new XrpTransactionFailedError(`XRP transaction failed: ${transactionResult}`);
	}

	progress?.(ProgressStepsSendXrp.DONE);

	return { txHash, submitResult: result };
};
