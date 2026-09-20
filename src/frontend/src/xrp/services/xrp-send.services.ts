import { ZERO } from '$lib/constants/app.constants';
import { ProgressStepsSendXrp } from '$lib/enums/progress-steps';
import type { NullishIdentity } from '$lib/types/identity';
import { consoleError } from '$lib/utils/console.utils';
import { randomWait } from '$lib/utils/time.utils';
import {
	XRP_ACCOUNT_FLAG_REQUIRE_DEST_TAG,
	XRP_BASE_RESERVE_DROPS,
	XRP_CONFIRM_MAX_ATTEMPTS,
	XRP_CONFIRM_MAX_DURATION_MS,
	XRP_CONFIRM_MAX_LEDGER_LOOKAHEAD,
	XRP_CONFIRM_MAX_POLL_MS,
	XRP_CONFIRM_MIN_POLL_MS,
	XRP_CONFIRM_POLLS_PER_LEDGER_CLOSE,
	XRP_LAST_LEDGER_SEQUENCE_OFFSET,
	XRP_MAX_DESTINATION_TAG,
	XRP_MAX_FEE_DROPS,
	XRP_MAX_UINT32
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
	deriveXrpLedgerWindow,
	deriveXrpTransactionHash,
	isXrpSubmitFinalFailure,
	isXrpTransactionSuccessful
} from '$xrp/utils/xrp-transaction.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

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
	// The first validated index this run reads, kept as the reference every later one is measured
	// against. It has nothing to corroborate it and is accepted as given — a run has to start
	// somewhere — so this bounds how far the ledger appears to MOVE while the poll watches, not
	// whether it was in a sane place to begin with. An absurd first read is caught by what already
	// guards expiry: `tx` must also report `searched_all` absence over the blob's own ledger range,
	// which is a claim about exactly those 21 ledgers, on a different method.
	//
	// Measured from the run and NOT from `lastLedgerSequence`, which is where this went wrong
	// before: for a retry that value comes out of the stored blob, so it is an expiry already in
	// the past, and any retry more than `XRP_CONFIRM_MAX_LEDGER_LOOKAHEAD` closes later had every
	// legitimate index rejected — leaving the retry path with no way to ever establish expiry.
	let baselineLedgerIndex: number | undefined;

	const tryValidatedLedgerIndex = async (): Promise<number | undefined> => {
		try {
			const index = await loadXrpValidatedLedgerIndex({ network });

			if (isNullish(baselineLedgerIndex)) {
				baselineLedgerIndex = index;

				return index;
			}

			// Returned as `undefined`, so an implausible jump is handled exactly like a read the node
			// refused: the poll continues and ends indeterminate, rather than concluding the expiry
			// that tells a retry to build a new transaction on a new sequence.
			return index > baselineLedgerIndex + XRP_CONFIRM_MAX_LEDGER_LOOKAHEAD ? undefined : index;
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

	// Two limits on the same exit, because the attempt count does not bound one on its own: each
	// attempt costs an interval plus however long its requests take, so a node answering slowly
	// stretches the count far past the window it was derived from. Whichever comes first ends the
	// poll, and for a node that answers at all that is the attempts.
	const deadline = Date.now() + XRP_CONFIRM_MAX_DURATION_MS;

	for (let attempt = 0; attempt < XRP_CONFIRM_MAX_ATTEMPTS && Date.now() < deadline; attempt++) {
		const outcome = await tryOutcome();

		if (outcome?.state === 'validated') {
			return outcome.transactionResult;
		}

		// The deadline is a wall clock, and the loop condition only reads it BETWEEN iterations. One
		// entered just under it could still start a validated-ledger read, an expiry recheck and a
		// poll interval — each request bounded by `XRP_RPC_TIMEOUT_MS` of its own — and overshoot
		// the documented budget by three timeouts. A definitive answer already in hand is returned
		// above; past the deadline, no further work is started.
		if (Date.now() >= deadline) {
			break;
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
				// Never on a spent budget. The recheck is what keeps a stale lookup from becoming a
				// false expiry, so skipping it must skip the conclusion too — the loop ends
				// indeterminate, which hands the blob back, rather than asserting a payment that
				// may have landed never did.
				if (Date.now() >= deadline) {
					break;
				}

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

		// Nothing follows a wait that outlives the budget it is waiting inside, so it is not taken.
		if (Date.now() >= deadline) {
			break;
		}

		// Explicit rather than `randomWait`'s defaults: `XRP_CONFIRM_MAX_ATTEMPTS` and the ledger-read
		// skip are both derived from this interval, so the loop has to wait what they assume.
		await randomWait({ min: XRP_CONFIRM_MIN_POLL_MS, max: XRP_CONFIRM_MAX_POLL_MS });
	}

	// Which limit ended it is worth saying: one means the ledger never decided, the other that the
	// node was too slow to let it. Both leave the outcome unknown, and the caller treats them the
	// same — the signed transaction goes back with the error either way.
	throw new Error(
		`XRP transaction confirmation stopped before its ledger expiry was reached: ${
			Date.now() < deadline
				? `${XRP_CONFIRM_MAX_ATTEMPTS} attempts made`
				: `${XRP_CONFIRM_MAX_DURATION_MS}ms elapsed`
		}.`
	);
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
	const { txBlob } = pending;

	// Before anything is broadcast: the window comes out of the blob, so it cannot describe a
	// different transaction than the one submitted, and an unbounded blob is refused here rather
	// than polled to a false expiry.
	const { firstLedgerSequence, lastLedgerSequence } = deriveXrpLedgerWindow(txBlob);

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
	if (
		nonNullish(result) &&
		isXrpSubmitFinalFailure({ submitResult: result, transactionId: txHash })
	) {
		throw new Error(
			`XRP transaction rejected: ${result.engineResult}${
				result.engineResultMessage ? ` (${result.engineResultMessage})` : ''
			}`
		);
	}

	// Past this point the blob is on the wire, and a progress observer must not be able to change
	// what happened to it. The two calls below are the only ones that run after the broadcast —
	// `INITIALIZATION`, `SIGN` and `SEND` all precede `submitXrpTransaction`, where an observer
	// throwing aborts with nothing submitted, which is correct and must keep working.
	//
	// Unguarded, each rewrote an outcome it had no part in. A throw at `CONFIRM` escaped as a plain
	// error with no `pending` attached — indistinguishable from a pre-broadcast failure, so a
	// caller rebuilds on a new sequence and pays twice. A throw at `DONE` was worse: it runs on a
	// validated `tesSUCCESS`, so it reported a payment that definitively landed as a rejection,
	// where a resend is unambiguously a duplicate rather than merely possibly one.
	//
	// Logged rather than discarded: an observer throwing is a caller bug, and the only thing that
	// changes here is that it can no longer decide the send.
	const reportPostBroadcastProgress = (step: ProgressStepsSendXrp) => {
		try {
			progress?.(step);
		} catch (err: unknown) {
			consoleError(
				`XRP send progress observer threw at ${step}; the transaction outcome is unaffected.`,
				err
			);
		}
	};

	reportPostBroadcastProgress(ProgressStepsSendXrp.CONFIRM);

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

	reportPostBroadcastProgress(ProgressStepsSendXrp.DONE);

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
 * A retry of a send whose outcome was never established is {@link retryXrpSend}, not this
 * function: the two share only the network and the progress callback, and nothing here applies to
 * an already-signed transaction.
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

	// The node's error is the only thing that means unfunded. A zero balance does not: the
	// transaction cost can take an existing account below its reserve, even to nothing, and the
	// account still exists — at which point it can receive any amount, since receiving carries no
	// reserve requirement of its own.
	//
	// Three states, not a boolean: "it is not there" and "I could not ask" lead to different
	// decisions, and an unavailable lookup keeps its error rather than discarding it, because
	// whether that matters depends on the amount and only the guards below know it. The flags come
	// back with it — they are in the same response, so reading them costs nothing.
	// Both snapshots, reduced to the three facts the guards below actually need. A creation, a
	// deletion or an `lsfRequireDestTag` change that lives only in the open ledger may never
	// validate, and trusting it lets a below-reserve or untagged payment through to a fee-claiming
	// `tec*` — which is the outcome this function declines payments before signing to avoid.
	//
	// The pessimistic reading in both directions. `settled` requires the account in BOTH, so a
	// creation that has not validated and a deletion that has not validated are equally unsettled
	// without needing a rule each. `requiresTag` fires if EITHER snapshot has the bit, because a
	// tag that turns out not to have been needed costs nothing — XRPL simply carries it — while a
	// missing one claims the fee.
	//
	// A false decline here is cheap and actionable: it says the amount must reach the account
	// reserve, before anything is signed. That is the trade this file makes everywhere else.
	interface XrpDestinationFacts {
		settled: boolean;
		requiresTag: boolean;
		// Kept rather than thrown, because whether an unanswerable lookup matters depends on the
		// amount and only the guards know it.
		unavailable: Error | undefined;
	}

	// `flags` is a number on the `exists` branch, not an optional one: `Flags` is a mandatory
	// AccountRoot field, so a response without it fails the parse and lands on `error` — an
	// unanswerable lookup — rather than arriving here as a snapshot with nothing to say.
	type XrpDestinationRead = { exists: true; flags: number } | { exists: false } | { error: Error };

	const readDestination = async (
		ledgerIndex: 'current' | 'validated'
	): Promise<XrpDestinationRead> => {
		try {
			const { flags } = await loadXrpAccountInfo({ address: destination, network, ledgerIndex });

			return { exists: true, flags };
		} catch (err: unknown) {
			if (err instanceof XrpAccountNotFoundError) {
				return { exists: false };
			}

			return { error: err instanceof Error ? err : new Error(String(err)) };
		}
	};

	const tryDestination = async (): Promise<XrpDestinationFacts> => {
		const reads = await Promise.all([readDestination('current'), readDestination('validated')]);

		return {
			settled: reads.every((read) => 'exists' in read && read.exists),
			requiresTag: reads.some(
				(read) => 'flags' in read && (read.flags & XRP_ACCOUNT_FLAG_REQUIRE_DEST_TAG) !== 0
			),
			unavailable: reads.find((read): read is { error: Error } => 'error' in read)?.error
		};
	};

	// A payment to yourself is refused from the arguments alone, for the reason the bounds below
	// are: the ledger rejects it — rippled's `Payment::preflight` answers `temREDUNDANT` for a
	// payment whose destination is its sender — but only after this has spent five RPC reads, a
	// signing-key derivation and a threshold signature from the signer canister, and put the blob
	// on the wire. Nothing is charged, since `tem*` is never applied, and nothing about the
	// account state is needed to know it.
	//
	// Compared raw, like the `Account` binding in the reads: a classic address is base58 over a
	// checksummed payload, so case is significant and two forms differing in it are not one
	// address.
	if (source === destination) {
		throw new Error(`XRP destination ${destination} is the sending account.`);
	}

	// Bounded from below before anything is fetched or signed. Only the upper ends were checked,
	// and the two ends fail in different places: `ripple-binary-codec` encodes `Amount: '0'`
	// happily, so a zero-amount payment spent a threshold signature and a submit to learn
	// `temBAD_AMOUNT` from the ledger, while a negative amount or fee throws `-5 is an illegal
	// amount` from inside the codec — after the account read, the ledger read and the signing-key
	// call. Neither reaches the ledger and neither is charged, since `tem*` is not applied; both
	// are knowable from the arguments alone.
	//
	// A negative fee is the one that also corrupts a guard rather than just failing late: it is
	// subtracted in `getXrpMaxAmount`, so it RAISES the sendable maximum that exists to keep the
	// account above its reserve.
	if (amount <= ZERO) {
		throw new Error(`XRP amount must be greater than zero, got ${amount} drops.`);
	}

	if (fee <= ZERO) {
		throw new Error(`XRP fee must be greater than zero, got ${fee} drops.`);
	}

	// The tag is caller input typed `number`, so negative, fractional, non-finite and
	// above-`UInt32` values are all type-legal and all die inside `ripple-binary-codec` — after the
	// account read, the ledger read and the signing-key call. Worse, the required-destination-tag
	// guard below asks only whether a tag is nullish, so `NaN` counts as having supplied one and
	// suppresses the decline: a guard satisfied by a value that cannot become a tag.
	//
	// Inclusive at both ends. `0` is a real tag rather than an absent one, which is why
	// `buildXrpPayment` refuses to let an omitted tag become `0`, and `0xFFFFFFFF` is a real tag
	// too. `Number.isInteger` rejects `NaN` and `Infinity` on its own.
	if (
		nonNullish(destinationTag) &&
		(!Number.isInteger(destinationTag) ||
			destinationTag < 0 ||
			destinationTag > XRP_MAX_DESTINATION_TAG)
	) {
		throw new Error(
			`XRP destination tag must be an unsigned 32-bit integer, got ${destinationTag}.`
		);
	}

	// `fee` is the figure the amount was priced and reviewed against, passed in rather than
	// re-fetched: signing a fresh estimate would sign a fee the user never saw and could push the
	// total past the balance even though the caller's sendability check passed.
	//
	// Still bounded here, since the value reaching this point is ultimately node-derived.
	if (fee > XRP_MAX_FEE_DROPS) {
		throw new Error(`XRP fee ${fee} drops exceeds the maximum of ${XRP_MAX_FEE_DROPS} drops.`);
	}

	// The signing key is deliberately NOT in here. Three guards below depend on these reads and so
	// cannot run before them, and `Promise.all` rejects on the first rejection — so a key failure
	// would win a race against whichever of those diagnoses was the useful one. A key mismatch is a
	// broken deployment; an insufficient balance is something the user can act on.
	// Both snapshots of the sender, because neither is safe alone, and every value below takes the
	// direction that cannot hurt: the higher sequence, the lower balance, the higher owner count.
	const [openAccount, validatedAccount, destinationLookup, ledgerIndex] = await Promise.all([
		loadXrpAccountInfo({ address: source, network, ledgerIndex: 'current' }),
		loadXrpAccountInfo({ address: source, network, ledgerIndex: 'validated' }),
		tryDestination(),
		loadXrpLedgerIndex({ network })
	]);

	// The HIGHER sequence, not the open one. The open ledger is ahead of the validated one at any
	// single instant, but these are two concurrent calls that do not share an instant: if `current`
	// is answered while a transaction is still unapplied it reports N, and if a ledger close
	// validates that transaction before `validated` is answered, that read reports N+1. Signing the
	// open one then signs a sequence already consumed, which XRPL answers `tefPAST_SEQ`.
	//
	// The maximum cannot overshoot, which is what makes it safe rather than merely safer — a gapped
	// sequence is the failure this file works hardest to avoid. Validated state at an instant is a
	// subset of open state at that same instant, so `validated(t2) <= open(t2)`, and the sequence
	// only ever increases, so `open(t1) <= open(t2)`. The larger of the two observations is
	// therefore bounded above by the true open sequence at the later read: it can close the gap the
	// race opens and cannot invent one.
	//
	// Neither snapshot sees rippled's transaction queue, so this does not address the queued
	// sequence recorded in the PR caveats — that one is not a race between these two reads.
	const sequence = Math.max(openAccount.sequence, validatedAccount.sequence);

	// The lower balance and the higher owner count: a pending credit must not raise what can be
	// sent, and an object created in the open ledger must not have its reserve ignored.
	const balance =
		openAccount.balance < validatedAccount.balance ? openAccount.balance : validatedAccount.balance;
	const ownerCount = Math.max(openAccount.ownerCount, validatedAccount.ownerCount);

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

	if (requiresExistingDestination && nonNullish(destinationLookup.unavailable)) {
		throw destinationLookup.unavailable;
	}

	// The destination can still be funded between this read and submission, so the validated result
	// stays the final word — this declines only what the node positively reported.
	// "Not settled" rather than "absent": a destination created in the open ledger but not yet
	// validated is in the same position as one that does not exist at all, because the creation can
	// still be rolled back and the payment would then be applied as `tecNO_DST_INSUF_XRP`.
	if (requiresExistingDestination && !destinationLookup.settled) {
		throw new Error(
			`XRP destination ${destination} does not exist yet in settled ledger state, so the amount must be at least the ${XRP_BASE_RESERVE_DROPS} drops account reserve to create it.`
		);
	}

	// An exchange or other shared account sets `lsfRequireDestTag` because the tag is what credits
	// the payment to a customer. Without one XRPL applies the payment as `tecDST_TAG_NEEDED`:
	// another fee destroyed and sequence consumed for nothing delivered, out of the same response
	// the reserve guard above already read.
	//
	// A supplied tag satisfies the requirement whatever the flags say, so both guards below only
	// concern a send without one.
	if (isNullish(destinationTag) && destinationLookup.requiresTag) {
		throw new Error(
			`XRP destination ${destination} requires a destination tag, so a payment without one cannot be delivered.`
		);
	}

	// A tag requirement can only be ruled OUT by an answer, and an unavailable read is not one.
	// This guard started advisory, on the argument that almost every send omits a tag so declining
	// here would let a busy node stop ordinary sends. That argument covered a node that did not
	// reply; it did not cover a node that replied with something unusable, which lands in exactly
	// the same place and was letting an untagged payment through to `tecDST_TAG_NEEDED` — fee
	// claimed, sequence consumed. The two are indistinguishable from here, so the honest reading is
	// that the flags are unknown, and unknown is not "no".
	//
	// Strict for the same reason the reserve guard is strict where the answer decides: the cost is
	// that untagged sends are refused while the destination read is failing, which beats a fee the
	// user pays to learn what the read would have told them. The node's own error is propagated
	// rather than restated, so the reason reaching the caller is the real one.
	if (isNullish(destinationTag) && nonNullish(destinationLookup.unavailable)) {
		throw destinationLookup.unavailable;
	}

	// After every guard, so a send that was going to be refused does not derive a key first. On a
	// deployed build that costs only local hashing — `deriveTokenAddress` derives locally whenever
	// `FRONTEND_DERIVATION_ENABLED`, which is `!LOCAL` — so serialising it here buys the clearer
	// error at the price of one overlapped call in local development, where the signer-canister
	// fallback is the one that actually runs.
	// `LastLedgerSequence` is `ledgerIndex + XRP_LAST_LEDGER_SEQUENCE_OFFSET`, and that sum has to
	// stay a `UInt32` even though the index alone is already bounded to one. Checked here because
	// this is the earliest point `ledgerIndex` exists, and before the key derivation so a doomed
	// send does not pay for one: otherwise the failure arrives from inside `ripple-binary-codec`,
	// as `must be >= 0 and <= 4294967295`, which says nothing about the ledger index that caused it.
	//
	// Not reachable from a real ledger — mainnet is around 107 million and this trips near 4.29
	// billion, some five centuries of closes away — so this is a guard against a node reporting an
	// index it has no business reporting, like the others on this path.
	if (ledgerIndex > XRP_MAX_UINT32 - XRP_LAST_LEDGER_SEQUENCE_OFFSET) {
		throw new Error(
			`XRP ledger index ${ledgerIndex} cannot form a UInt32 LastLedgerSequence with the ${XRP_LAST_LEDGER_SEQUENCE_OFFSET} ledger offset.`
		);
	}

	const signingPublicKey = await getXrpSigningPublicKey({ identity, network, account: source });

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
		pending: { txBlob },
		progress
	});
};

/**
 * Resubmits a send whose outcome was never established, from the
 * {@link XrpSendIndeterminateError} that reported it.
 *
 * The stored transaction goes back unchanged — nothing is fetched, rebuilt or re-signed — so if the
 * first attempt did land, its sequence is already consumed and the ledger refuses this one
 * (`tefPAST_SEQ`) rather than making a second payment. Building a fresh transaction in that
 * situation takes a NEW sequence, which is precisely what pays twice.
 *
 * Separate from {@link sendXrp} rather than a `pending` field on it, because the two have almost
 * nothing in common: this takes no identity, no addresses, no amount and no fee, and a signature
 * that accepted them would accept a reviewed payment alongside a stored blob and silently act on
 * the blob. The window they are polled over is not a parameter either — it is read out of the blob
 * by `deriveXrpLedgerWindow`.
 */
export const retryXrpSend = async ({
	network,
	pending,
	progress
}: {
	network: XrpNetworkType;
	pending: XrpPendingTransaction;
	progress?: (step: ProgressStepsSendXrp) => void;
}): Promise<XrpSendResult> => {
	progress?.(ProgressStepsSendXrp.INITIALIZATION);

	return await submitAndConfirmXrpTransaction({ network, pending, progress });
};
