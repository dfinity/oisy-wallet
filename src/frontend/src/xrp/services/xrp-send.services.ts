import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import { getActiveUserTransactions } from '$lib/api/backend.api';
import { ZERO } from '$lib/constants/app.constants';
import { ProgressStepsSendXrp } from '$lib/enums/progress-steps';
import { createActiveUserTransaction } from '$lib/services/active-user-transactions.services';
import type { NullishIdentity } from '$lib/types/identity';
import type { Token } from '$lib/types/token';
import { consoleError } from '$lib/utils/console.utils';
import { formatToken } from '$lib/utils/format.utils';
import {
	XRP_ACCOUNT_FLAG_REQUIRE_DEST_TAG,
	XRP_BASE_RESERVE_DROPS,
	XRP_LAST_LEDGER_SEQUENCE_OFFSET,
	XRP_MAX_DESTINATION_TAG,
	XRP_MAX_FEE_DROPS,
	XRP_MAX_UINT32
} from '$xrp/constants/xrp.constants';
import { XrpRpcNotConfiguredError } from '$xrp/providers/xrp-rpc.providers';
import {
	XrpAccountNotFoundError,
	loadXrpAccountInfo,
	loadXrpLedgerIndex,
	submitXrpTransaction
} from '$xrp/rest/xrpl.rest';
import { getXrpSigningPublicKey, signXrpTransaction } from '$xrp/services/xrp-sign.services';
import type { XrpAddress } from '$xrp/types/address';
import type { XrpNetworkType } from '$xrp/types/network';
import { XRP_EXTERNAL_REF_KEYS } from '$xrp/types/xrp-active-tx';
import type { XrpBalance } from '$xrp/types/xrp-balance';
import {
	XrpAmountExceedsSendableError,
	XrpDestinationTagRequiredError,
	XrpDestinationUnfundedError,
	XrpSelfDestinationError,
	XrpSendAlreadyInFlightError,
	XrpSendNotGuardedError
} from '$xrp/types/xrp-send';
import type { XrpSendResult, XrpSubmitResult } from '$xrp/types/xrp-transaction';
import {
	openXrpActiveUserTransaction,
	toXrpData,
	toXrpDisplayRefs,
	toXrpExternalRefs
} from '$xrp/utils/xrp-active-tx.utils';
import { getXrpMaxAmount, getXrpReserveDrops } from '$xrp/utils/xrp-send.utils';
import {
	buildXrpPayment,
	deriveXrpLedgerWindow,
	deriveXrpTransactionHash
} from '$xrp/utils/xrp-transaction.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';

/**
 * Refuses the send if a payment from this address has not resolved yet.
 *
 * The gate is per **address**, not per user: a record for a different address says nothing about
 * this one's sequence, and refusing on it would block an unrelated send. There is no override —
 * the whole point is that no second sequence is safe while the first payment is open.
 */
const assertNoOpenXrpSend = async ({
	identity,
	source
}: {
	identity: NullishIdentity;
	source: XrpAddress;
}): Promise<Identity> => {
	// Fails closed. Without an identity the record can neither be read nor written, so the
	// invariant cannot be held — and an unguarded send is the failure this path exists to prevent.
	if (isNullish(identity)) {
		throw new XrpSendNotGuardedError(
			'XRP send refused: the wallet could not check for an unresolved payment without an identity.'
		);
	}

	// `loadActiveUserTransactions` swallows backend errors by design, so a failed load leaves the
	// store as it was — which would read as "no open record". Asked directly instead: this answer
	// decides whether a second sequence is signed, so it must come from the backend or not at all.
	let transactions: ActiveUserTransaction[];

	try {
		transactions = await getActiveUserTransactions({ identity });
	} catch (err: unknown) {
		throw new XrpSendNotGuardedError(
			`XRP send refused: the wallet could not check for an unresolved payment. ${
				err instanceof Error ? err.message : `${err}`
			}`
		);
	}

	if (nonNullish(openXrpActiveUserTransaction({ transactions, source }))) {
		throw new XrpSendAlreadyInFlightError(
			`XRP send refused: a payment from ${source} has not resolved yet.`
		);
	}

	return identity;
};

/**
 * Creates the record that holds the invariant.
 *
 * Refuses the send if it cannot be created — at the per-user cap, or with the backend unreachable.
 * Sending anyway would drop the guarantee at exactly the moment a retry is most likely, and would
 * leave the payment with nothing to resolve it.
 */
const openXrpSendRecord = async ({
	identity,
	token,
	source,
	destination,
	destinationTag,
	amount,
	fee,
	txHash,
	lastLedgerSequence
}: {
	identity: Identity;
	token: Token;
	source: XrpAddress;
	destination: XrpAddress;
	destinationTag?: number;
	amount: XrpBalance;
	fee: XrpBalance;
	txHash: string;
	lastLedgerSequence: number;
}): Promise<void> => {
	const data = toXrpData({ token, source, destination, destinationTag, amount, fee });

	if (isNullish(data)) {
		throw new XrpSendNotGuardedError(
			`XRP send refused: ${token.network.name} has no backend token identity, so an unresolved payment could not be recorded.`
		);
	}

	try {
		await createActiveUserTransaction({
			identity,
			id: crypto.randomUUID(),
			data,
			progressStep: ProgressStepsSendXrp.SEND,
			externalRefs: toXrpExternalRefs({
				[XRP_EXTERNAL_REF_KEYS.TX_HASH]: txHash,
				[XRP_EXTERNAL_REF_KEYS.LAST_LEDGER_SEQUENCE]: `${lastLedgerSequence}`,
				...toXrpDisplayRefs({
					token,
					amount: formatToken({ value: amount, unitName: token.decimals })
				})
			})
		});
	} catch (err: unknown) {
		throw new XrpSendNotGuardedError(
			`XRP send refused: the unresolved payment could not be recorded. ${
				err instanceof Error ? err.message : `${err}`
			}`
		);
	}
};

/**
 * Sends native XRP: fetches the account sequence, whether the destination exists and the current
 * ledger index, builds and threshold-signs a Payment, records it, and submits it.
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
 * It stops at the submit and does **not** wait for the transaction to validate. The Active User
 * Transaction record opened just before the broadcast is what establishes the outcome, and the
 * global poller drives it — for this send and for one whose session died, on the same code. So
 * the returned hash says what was broadcast, never that it landed.
 */
export const sendXrp = async ({
	identity,
	network,
	source,
	destination,
	amount,
	fee,
	destinationTag,
	token,
	progress
}: {
	identity: NullishIdentity;
	network: XrpNetworkType;
	source: XrpAddress;
	destination: XrpAddress;
	amount: XrpBalance;
	fee: XrpBalance;
	destinationTag?: number;
	token: Token;
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
		throw new XrpSelfDestinationError(`XRP destination ${destination} is the sending account.`);
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

	// After the guards that need nothing but the arguments, and before the first node read — which
	// also keeps a self-payment or a zero amount from costing a backend round-trip to be told what
	// the arguments already say.
	//
	// An XRPL `Sequence` is a nonce, so while a payment from this address is unresolved there is no
	// safe sequence for a second one: reusing it answers `tefPAST_SEQ` or replaces a queued
	// transaction, and taking the next one signs into a gap that expires — which reports "nothing
	// was sent" for a payment that can still apply.
	//
	// Returns the identity narrowed, because the guard cannot run without one and the record write
	// below needs it non-nullish.
	const recordIdentity = await assertNoOpenXrpSend({ identity, source });

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
		throw new XrpAmountExceedsSendableError(
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
		throw new XrpDestinationUnfundedError(
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
		throw new XrpDestinationTagRequiredError(
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

	// Before anything is broadcast: both values come out of the blob, so neither can describe a
	// different transaction than the one submitted, and an unbounded blob is refused here rather
	// than recorded against a window nothing signed.
	const { lastLedgerSequence: signedLastLedgerSequence } = deriveXrpLedgerWindow(txBlob);
	const txHash = await deriveXrpTransactionHash(txBlob);

	// After signing and before submitting, which is the only correct moment. Later would miss a
	// submit whose response is lost — precisely the case the record exists for. Earlier would be a
	// claim about a transaction that does not exist yet.
	await openXrpSendRecord({
		identity: recordIdentity,
		token,
		source,
		destination,
		destinationTag,
		amount,
		fee,
		txHash,
		lastLedgerSequence: signedLastLedgerSequence
	});

	progress?.(ProgressStepsSendXrp.SEND);

	let submitResult: XrpSubmitResult | undefined;

	try {
		submitResult = await submitXrpTransaction({ txBlob, network });
	} catch (err: unknown) {
		// The one failure that provably precedes the request: the endpoint comes from a build-time
		// constant, so nothing was broadcast and nothing can have been. It is rethrown so the caller
		// reports a send that definitively did not happen.
		if (err instanceof XrpRpcNotConfiguredError) {
			throw err;
		}

		// Everything else is ambiguous: a rejected `fetch`, a non-ok status and a malformed body all
		// follow a request that may already have been processed. Swallowed on purpose — the record is
		// open and the ledger decides, which is exactly what a lost submit response needs.
		consoleError(
			'XRP submit did not return a usable response; the record decides the outcome.',
			err
		);
	}

	// Deliberately no confirmation here. The record is the one confirmation path, and the poller
	// drives it — for this send and for one whose session died, on the same code. Waiting here as
	// well would mean two writers racing for a status the backend makes immutable, and would hold
	// the user for the whole validity window in the one case the record already covers.
	//
	// So these two steps report the broadcast finishing, NOT the payment landing. Nothing is
	// reloaded here either: at this point the payment has not validated, so there is nothing new to
	// read — the balance refresh belongs to the record's terminal side effects, which run when the
	// ledger has actually decided.
	progress?.(ProgressStepsSendXrp.RELOAD);
	progress?.(ProgressStepsSendXrp.DONE);

	return { txHash, submitResult };
};
