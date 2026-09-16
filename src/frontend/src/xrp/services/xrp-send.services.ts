import { ProgressStepsSendXrp } from '$lib/enums/progress-steps';
import type { NullishIdentity } from '$lib/types/identity';
import { randomWait } from '$lib/utils/time.utils';
import {
	XRP_CONFIRM_MAX_ATTEMPTS,
	XRP_DEFAULT_FEE_DROPS,
	XRP_LAST_LEDGER_SEQUENCE_OFFSET,
	XRP_MAX_FEE_DROPS
} from '$xrp/constants/xrp.constants';
import {
	loadXrpAccountInfo,
	loadXrpLedgerIndex,
	loadXrpOpenLedgerFee,
	loadXrpTransactionOutcome,
	loadXrpValidatedLedgerIndex,
	submitXrpTransaction
} from '$xrp/rest/xrpl.rest';
import { getXrpSigningPublicKey, signXrpTransaction } from '$xrp/services/xrp-sign.services';
import type { XrpAddress } from '$xrp/types/address';
import type { XrpNetworkType } from '$xrp/types/network';
import type { XrpBalance } from '$xrp/types/xrp-balance';
import type { XrpSubmitResult } from '$xrp/types/xrp-transaction';
import {
	buildXrpPayment,
	isXrpSubmitAccepted,
	isXrpTransactionSuccessful
} from '$xrp/utils/xrp-transaction.utils';
import { assertNonNullish } from '@dfinity/utils';

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
	for (let attempt = 0; attempt < XRP_CONFIRM_MAX_ATTEMPTS; attempt++) {
		const { validated, transactionResult } = await loadXrpTransactionOutcome({ hash, network });

		if (validated) {
			return transactionResult;
		}

		// The VALIDATED index, not the open one: the open ledger has already advanced past a
		// closed ledger whose transactions are not yet validated, so comparing against it would
		// declare expiry for a payment that is about to validate.
		const validatedLedgerIndex = await loadXrpValidatedLedgerIndex({ network });

		if (validatedLedgerIndex > lastLedgerSequence) {
			// The `tx` lookup above and this index come from two separate calls, so the lookup may
			// have missed a payment that validated in between. Expiry is only final if it survives
			// a recheck against the newer ledger state — otherwise a succeeded payment would be
			// reported as failed and the user invited to send a duplicate.
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
	destinationTag,
	progress
}: {
	identity: NullishIdentity;
	network: XrpNetworkType;
	source: XrpAddress;
	destination: XrpAddress;
	amount: XrpBalance;
	destinationTag?: number;
	progress?: (step: ProgressStepsSendXrp) => void;
}): Promise<XrpSubmitResult> => {
	progress?.(ProgressStepsSendXrp.INITIALIZATION);

	const [{ sequence }, fee, ledgerIndex, signingPublicKey] = await Promise.all([
		loadXrpAccountInfo({ address: source, network }),
		loadXrpOpenLedgerFee({ network, fallbackFee: XRP_DEFAULT_FEE_DROPS }),
		loadXrpLedgerIndex({ network }),
		getXrpSigningPublicKey({ identity, network })
	]);

	// The fee comes from the node and escalates with load, so it is bounded here: an escalated
	// or hostile estimate must fail loudly rather than be signed for an amount the user never
	// reviewed. The transaction is not yet bound to the reviewed fee — that arrives with the
	// send wizard, which can pass it in.
	if (fee > XRP_MAX_FEE_DROPS) {
		throw new Error(
			`XRP fee estimate ${fee} drops exceeds the maximum of ${XRP_MAX_FEE_DROPS} drops.`
		);
	}

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

	progress?.(ProgressStepsSendXrp.SEND);
	const result = await submitXrpTransaction({ txBlob, network });

	if (!isXrpSubmitAccepted(result)) {
		throw new Error(
			`XRP transaction rejected: ${result.engineResult}${
				result.engineResultMessage ? ` (${result.engineResultMessage})` : ''
			}`
		);
	}

	progress?.(ProgressStepsSendXrp.CONFIRM);
	const { txHash } = result;
	assertNonNullish(txHash, 'XRP submit response did not include a transaction hash.');

	const transactionResult = await confirmXrpTransaction({
		hash: txHash,
		network,
		lastLedgerSequence
	});

	if (!isXrpTransactionSuccessful(transactionResult)) {
		throw new Error(`XRP transaction failed: ${transactionResult}`);
	}

	progress?.(ProgressStepsSendXrp.DONE);

	return result;
};
