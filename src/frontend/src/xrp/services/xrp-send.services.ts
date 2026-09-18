import { ProgressStepsSendXrp } from '$lib/enums/progress-steps';
import type { NullishIdentity } from '$lib/types/identity';
import { randomWait } from '$lib/utils/time.utils';
import {
	XRP_BASE_RESERVE_DROPS,
	XRP_CONFIRM_MAX_ATTEMPTS,
	XRP_CONFIRM_MAX_POLL_MS,
	XRP_CONFIRM_MIN_POLL_MS,
	XRP_CONFIRM_POLLS_PER_LEDGER_CLOSE,
	XRP_LAST_LEDGER_SEQUENCE_OFFSET,
	XRP_MAX_FEE_DROPS
} from '$xrp/constants/xrp.constants';
import {
	XrpAccountNotFoundError,
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
import {
	XrpSendExpiredError,
	XrpSendIndeterminateError,
	XrpTransactionFailedError
} from '$xrp/types/xrp-send';
import type {
	XrpPendingTransaction,
	XrpSendResult,
	XrpSubmitResult,
	XrpTransactionOutcome
} from '$xrp/types/xrp-transaction';
import { getXrpMaxAmount, getXrpReserveDrops } from '$xrp/utils/xrp-send.utils';
import {
	buildXrpPayment,
	deriveXrpTransactionHash,
	isXrpSubmitFinalFailure,
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
	firstLedgerSequence,
	lastLedgerSequence
}: {
	hash: string;
	network: XrpNetworkType;
	firstLedgerSequence: number;
	lastLedgerSequence: number;
}): Promise<string | undefined> => {
	// A lookup the node could not answer is not evidence of anything. While attempts remain it is
	// retried; what must never happen is concluding expiry from it, so the recheck below is
	// deliberately left to throw.
	const tryOutcome = async (): Promise<XrpTransactionOutcome | undefined> => {
		try {
			return await loadXrpTransactionOutcome({
				hash,
				network,
				firstLedgerSequence,
				lastLedgerSequence
			});
		} catch (_: unknown) {
			return undefined;
		}
	};

	// Same reasoning: this call runs after the blob may already have been accepted, so letting a
	// transient failure escape would abort the send for a payment that can still validate.
	const tryValidatedLedgerIndex = async (): Promise<number | undefined> => {
		try {
			return await loadXrpValidatedLedgerIndex({ network });
		} catch (_: unknown) {
			return undefined;
		}
	};

	// Expiry cannot happen until the validated index passes `LastLedgerSequence`, and the index only
	// moves once per ledger close while this loop polls two to four times as often. Once a read
	// tells us how many closes are still needed, asking again before roughly that many polls have
	// passed cannot change the outcome — which is why the previous version spent a ledger call on
	// every answered poll and almost none of them could decide anything.
	let nextLedgerReadAttempt = 0;

	for (let attempt = 0; attempt < XRP_CONFIRM_MAX_ATTEMPTS; attempt++) {
		const outcome = await tryOutcome();

		if (outcome?.state === 'validated') {
			return outcome.transactionResult;
		}

		// Expiry is only evaluated on a lookup the node actually answered; an unanswered one
		// establishes nothing and simply costs an attempt.
		if (nonNullish(outcome) && attempt >= nextLedgerReadAttempt) {
			// The VALIDATED index, not the open one: the open ledger has already advanced past a
			// closed ledger whose transactions are not yet validated, so comparing against it would
			// declare expiry for a payment that is about to validate.
			const validatedLedgerIndex = await tryValidatedLedgerIndex();

			// How far the ledger still has to travel, converted to polls. An unanswered read leaves
			// this unchanged, so the next attempt asks again rather than backing off on no evidence.
			if (nonNullish(validatedLedgerIndex)) {
				nextLedgerReadAttempt =
					attempt +
					Math.max(lastLedgerSequence - validatedLedgerIndex, 0) *
						XRP_CONFIRM_POLLS_PER_LEDGER_CLOSE;
			}

			if (nonNullish(validatedLedgerIndex) && validatedLedgerIndex > lastLedgerSequence) {
				// The `tx` lookup above and this index come from two separate calls, so the lookup may
				// have missed a payment that validated in between. Expiry is only final if it survives
				// a recheck against the newer ledger state — otherwise a succeeded payment would be
				// reported as failed and the user invited to send a duplicate. This one is not caught:
				// a node that fails to answer here leaves non-inclusion unestablished, and the error
				// must surface instead of being turned into a claim that the payment never applied.
				const recheck = await loadXrpTransactionOutcome({
					hash,
					network,
					firstLedgerSequence,
					lastLedgerSequence
				});

				if (recheck.state === 'validated') {
					return recheck.transactionResult;
				}

				// A node that hands the transaction back, unvalidated, is not reporting non-inclusion —
				// it is reporting that the transaction exists. Nothing there supports "it can never
				// apply", and the two calls above can reach different members of a load-balanced
				// endpoint, so this is indeterminate: it escapes as a plain error, which the caller
				// wraps with the signed blob so a retry resubmits THIS transaction on its already
				// consumed sequence rather than building one with a new sequence.
				if (recheck.state === 'pending') {
					throw new Error(
						`XRP transaction outcome unresolved: ledger ${validatedLedgerIndex} is past ${lastLedgerSequence}, yet the node still reports the transaction as not validated.`
					);
				}

				// Past its LastLedgerSequence the transaction can never be applied, so this failure is
				// final — and, unlike an early timeout, sending again is safe. Its own error type,
				// because that distinction decides whether a retry may resubmit this transaction or
				// must build a new one.
				throw new XrpSendExpiredError(
					`XRP transaction expired: not included by ledger ${lastLedgerSequence}, so it can no longer be applied.`
				);
			}
		}

		// Explicit rather than `randomWait`'s defaults: `XRP_CONFIRM_MAX_ATTEMPTS` and the ledger-read
		// skip are both derived from this interval, so the loop has to wait what they assume.
		await randomWait({ min: XRP_CONFIRM_MIN_POLL_MS, max: XRP_CONFIRM_MAX_POLL_MS });
	}

	throw new Error('XRP transaction confirmation stopped before its ledger expiry was reached.');
};

/**
 * Submits a signed transaction and resolves its outcome from the ledger.
 *
 * Shared by a first attempt and by a retry, which is the point: a retry runs exactly these steps
 * over the same stored transaction, so it cannot become a second payment.
 */
const submitAndConfirmXrpTransaction = async ({
	network,
	pending,
	progress
}: {
	network: XrpNetworkType;
	pending: XrpPendingTransaction;
	progress?: (step: ProgressStepsSendXrp) => void;
}): Promise<XrpSendResult> => {
	const { txBlob, firstLedgerSequence, lastLedgerSequence } = pending;

	// Derived here, from the blob about to be broadcast, so the id polled below cannot be anything
	// but this transaction's. When it travelled as a field alongside the blob, a retry could submit
	// one transaction and poll another id.
	const txHash = await deriveXrpTransactionHash(txBlob);

	progress?.(ProgressStepsSendXrp.SEND);

	let result: XrpSubmitResult | undefined;

	try {
		result = await submitXrpTransaction({ txBlob, network });
	} catch (_: unknown) {
		// Ambiguous: a transport or shape failure says nothing about whether the node applied the
		// blob, so fall through to confirmation rather than declaring failure here.
	}

	// Only a malformed transaction is rejected here. Any other refusal — including a node saying it
	// did not take the blob — may still end up applied, and reporting it as failed would invite a
	// retry that pays twice, so it goes to confirmation and is decided by the ledger.
	if (nonNullish(result) && isXrpSubmitFinalFailure(result)) {
		throw new Error(
			`XRP transaction rejected: ${result.engineResult}${
				result.engineResultMessage ? ` (${result.engineResultMessage})` : ''
			}`
		);
	}

	progress?.(ProgressStepsSendXrp.CONFIRM);

	let transactionResult: string | undefined;

	try {
		transactionResult = await confirmXrpTransaction({
			hash: txHash,
			network,
			firstLedgerSequence,
			lastLedgerSequence
		});
	} catch (err: unknown) {
		// Expiry is the one confirmation failure that is definitive: the validated ledger passed
		// `LastLedgerSequence` and the hash was still absent on recheck, so this transaction can
		// never apply and a retry must build a new one. Everything else leaves the outcome unknown,
		// so the signed transaction is handed back with the error — a retry resubmits it, and the
		// ledger, not this code, decides whether it was already applied.
		if (err instanceof XrpSendExpiredError) {
			throw err;
		}

		throw new XrpSendIndeterminateError({
			message: err instanceof Error ? err.message : `${err}`,
			pending
		});
	}

	// Typed so the caller can tell this apart from an indeterminate confirmation: the ledger
	// validated the transaction and it failed, claiming the fee. Both are thrown at the CONFIRM
	// step, so the progress step alone cannot separate "known failure" from "unknown".
	if (!isXrpTransactionSuccessful(transactionResult)) {
		throw new XrpTransactionFailedError(`XRP transaction failed: ${transactionResult}`);
	}

	progress?.(ProgressStepsSendXrp.DONE);

	return { txHash, submitResult: result };
};

/**
 * Sends native XRP: fetches the account sequence, whether the destination exists and the current
 * ledger index, builds and threshold-signs a Payment, submits it, and waits for the transaction to
 * be included in a validated ledger.
 *
 * `fee` is a parameter rather than an estimate taken here, and that is the point: it is the figure
 * the amount was priced and reviewed against, so re-fetching it at signing time would sign a fee
 * the user never saw. Fee estimation and review belong to the caller; this function only bounds
 * what it is given.
 *
 * The destination read is what declines a payment too small to create an account that does not
 * exist yet — the ledger would apply that as `tecNO_DST_INSUF_XRP` and claim the fee.
 *
 * `amount` is in drops. The caller is responsible for having already reserved the
 * account base and owner reserves out of the max amount (see `getXrpMaxAmount`).
 *
 * `pending` retries a send whose outcome was never established, from the
 * {@link XrpSendIndeterminateError} that reported it. The stored transaction is resubmitted
 * unchanged — nothing is fetched, rebuilt or re-signed — so if the first attempt did land, its
 * sequence is already consumed and the ledger refuses this one (`tefPAST_SEQ`) rather than making
 * a second payment. Building a fresh transaction in that situation takes a NEW sequence, which is
 * precisely what pays twice.
 */
export const sendXrp = async ({
	identity,
	network,
	source,
	destination,
	amount,
	fee,
	destinationTag,
	pending,
	progress
}: {
	identity: NullishIdentity;
	network: XrpNetworkType;
	source: XrpAddress;
	destination: XrpAddress;
	amount: XrpBalance;
	fee: XrpBalance;
	destinationTag?: number;
	pending?: XrpPendingTransaction;
	progress?: (step: ProgressStepsSendXrp) => void;
}): Promise<XrpSendResult> => {
	progress?.(ProgressStepsSendXrp.INITIALIZATION);

	if (nonNullish(pending)) {
		return await submitAndConfirmXrpTransaction({ network, pending, progress });
	}

	// The node's error is the only thing that means unfunded. A zero balance does not: the
	// transaction cost can take an existing account below its reserve, even to nothing, and the
	// account still exists — at which point it can receive any amount, since receiving carries no
	// reserve requirement of its own.
	//
	// A lookup that could not run keeps its error instead of discarding it. Whether that matters
	// depends on the amount, and only the guard below knows it.
	const tryDestinationExists = async (): Promise<boolean | Error> => {
		try {
			await loadXrpAccountInfo({ address: destination, network });

			return true;
		} catch (err: unknown) {
			if (err instanceof XrpAccountNotFoundError) {
				return false;
			}

			return err instanceof Error ? err : new Error(String(err));
		}
	};

	// `fee` is the figure the amount was priced and reviewed against, passed in rather than
	// re-fetched: signing a fresh estimate would sign a fee the user never saw and could push the
	// total past the balance even though the caller's sendability check passed.
	//
	// Still bounded here, since the value reaching this point is ultimately node-derived.
	if (fee > XRP_MAX_FEE_DROPS) {
		throw new Error(`XRP fee ${fee} drops exceeds the maximum of ${XRP_MAX_FEE_DROPS} drops.`);
	}

	const [{ sequence, balance, ownerCount }, destinationExists, ledgerIndex, signingPublicKey] =
		await Promise.all([
			loadXrpAccountInfo({ address: source, network }),
			tryDestinationExists(),
			loadXrpLedgerIndex({ network }),
			getXrpSigningPublicKey({ identity, network, account: source })
		]);

	// The sender's own reserve, from the balance and `OwnerCount` this call already returned.
	// Without it, XRPL applies the payment as `tecUNFUNDED_PAYMENT`: the fee is destroyed, the
	// sequence is burned, nothing is delivered, and the failure only surfaces after the poll. The
	// spec makes this client-side check an acceptance criterion, and `getXrpMaxAmount` — which the
	// caller uses to offer a maximum — had no runtime caller until now.
	if (amount > getXrpMaxAmount({ balance, fee, ownerCount })) {
		throw new Error(
			`XRP amount ${amount} drops exceeds the sendable maximum for this account, which must retain ${getXrpReserveDrops({ ownerCount })} drops of reserve plus the ${fee} drops fee.`
		);
	}

	// XRPL answers a payment too small to create an account that does not exist with
	// `tecNO_DST_INSUF_XRP`, which is APPLIED: the payment fails and the fee is claimed. Refusing
	// before signing turns a charged failure into a plain error.
	//
	// The destination's existence only decides anything below the reserve: at or above it the
	// payment creates the account if it has to, and an account that already exists can receive any
	// amount. So the lookup is required exactly here and ignored everywhere else — a node that
	// could not answer must not block a well-funded send, but must not wave this one through into a
	// charged failure either.
	const requiresExistingDestination = amount < XRP_BASE_RESERVE_DROPS;

	if (requiresExistingDestination && destinationExists instanceof Error) {
		throw destinationExists;
	}

	// The destination can still be funded between this read and submission, so the validated result
	// stays the final word — this declines only what the node positively reported.
	if (requiresExistingDestination && destinationExists === false) {
		throw new Error(
			`XRP destination ${destination} does not exist yet, so the amount must be at least the ${XRP_BASE_RESERVE_DROPS} drops account reserve to create it.`
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

	return await submitAndConfirmXrpTransaction({
		network,
		pending: { txBlob, firstLedgerSequence: ledgerIndex, lastLedgerSequence },
		progress
	});
};
