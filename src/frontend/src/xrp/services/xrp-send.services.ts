import { XRP_TRUST_LINE_TOKENS_ENABLED } from '$env/xrp-trust-line-tokens.env';
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
	XRP_MAX_UINT32,
	XRP_TRANSFER_RATE_NO_FEE
} from '$xrp/constants/xrp.constants';
import { XrpRpcNotConfiguredError } from '$xrp/providers/xrp-rpc.providers';
import {
	XrpAccountNotFoundError,
	loadXrpAccountInfo,
	loadXrpAccountLines,
	loadXrpDepositAuthorized,
	loadXrpLedgerIndex,
	submitXrpTransaction
} from '$xrp/rest/xrpl.rest';
import { assertNoXrpPaymentInFlight } from '$xrp/services/xrp-in-flight.services';
import { getXrpSigningPublicKey, signXrpTransaction } from '$xrp/services/xrp-sign.services';
import type { XrpAddress } from '$xrp/types/address';
import type { XrpNetworkType } from '$xrp/types/network';
import { XRP_EXTERNAL_REF_KEYS } from '$xrp/types/xrp-active-tx';
import type { XrpBalance } from '$xrp/types/xrp-balance';
import {
	XrpAmountExceedsSendableError,
	XrpDestinationTagRequiredError,
	XrpDestinationUnfundedError,
	XrpPaymentRefusedError,
	XrpSelfDestinationError,
	XrpSendAlreadyInFlightError,
	XrpSendNotGuardedError,
	type XrpPaymentRecord,
	type XrpPaymentRecordBuilder
} from '$xrp/types/xrp-send';
import type { XrpPayment, XrpSendResult, XrpSubmitResult } from '$xrp/types/xrp-transaction';
import type { XrpTrustLine } from '$xrp/types/xrp-trust-line';
import type { XrpTrustLineToken } from '$xrp/types/xrp-trust-line-token';
import {
	isXrpAlreadyInFlightError,
	toXrpData,
	toXrpDisplayRefs,
	toXrpExternalRefs
} from '$xrp/utils/xrp-active-tx.utils';
import {
	getXrpMaxAmount,
	getXrpReserveDrops,
	xrpPaymentNeedsDepositPreauth,
	xrpTokenPaymentRefusal
} from '$xrp/utils/xrp-send.utils';
import {
	buildXrpPayment,
	buildXrpTokenPayment,
	deriveXrpLedgerWindow,
	deriveXrpTransactionHash
} from '$xrp/utils/xrp-transaction.utils';
import {
	fitsXrpTokenPrecision,
	formatXrpTokenValue,
	getXrpTokenSendMax,
	isTokenXrpTrustLine,
	parseXrpTokenValue
} from '$xrp/utils/xrp-trust-line.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';

/**
 * The record of a plain send: its own `Xrp` AUT, carrying the values fixed at signing, the two poll
 * keys and the snapshot the row renders with in a later session.
 */
const xrpSendRecord =
	({
		token,
		source,
		destination,
		destinationTag,
		amount,
		fee
	}: {
		token: Token;
		source: XrpAddress;
		destination: XrpAddress;
		destinationTag?: number;
		amount: XrpBalance;
		fee: XrpBalance;
	}): XrpPaymentRecordBuilder =>
	({ txHash, lastLedgerSequence }) => {
		const data = toXrpData({ token, source, destination, destinationTag, amount, fee });

		if (isNullish(data)) {
			throw new XrpSendNotGuardedError(
				`XRP send refused: ${token.network.name} has no backend token identity, so an unresolved payment could not be recorded.`
			);
		}

		return {
			data,
			progressStep: ProgressStepsSendXrp.SEND,
			externalRefs: toXrpExternalRefs({
				[XRP_EXTERNAL_REF_KEYS.TX_HASH]: txHash,
				[XRP_EXTERNAL_REF_KEYS.LAST_LEDGER_SEQUENCE]: `${lastLedgerSequence}`,
				...toXrpDisplayRefs({
					token,
					amount: formatToken({
						value: amount,
						unitName: token.decimals,
						displayDecimals: token.decimals
					})
				})
			})
		};
	};

/**
 * Creates the record that holds the invariant — a payment's, or a `TrustSet`'s.
 *
 * Refuses the payment if it cannot be created — at the per-user cap, or with the backend
 * unreachable. Sending anyway would drop the guarantee at exactly the moment a retry is most
 * likely, and would leave the payment with nothing to resolve it.
 */
export const openXrpPaymentRecord = async ({
	identity,
	source,
	record: { data, externalRefs, progressStep }
}: {
	identity: Identity;
	source: XrpAddress;
	record: XrpPaymentRecord;
}): Promise<void> => {
	try {
		await createActiveUserTransaction({
			identity,
			id: crypto.randomUUID(),
			data,
			progressStep,
			externalRefs
		});
	} catch (err: unknown) {
		// The backend refusing a second open payment is the same refusal the gate makes, so it reads
		// the same way to the user. This is the case the gate cannot catch on its own: its read is
		// not atomic with this create, and a second tab can pass it in the window between.
		if (isXrpAlreadyInFlightError(err)) {
			throw new XrpSendAlreadyInFlightError(
				`XRP send refused: a payment from ${source} has not resolved yet.`
			);
		}

		throw new XrpSendNotGuardedError(
			`XRP send refused: the unresolved payment could not be recorded. ${
				err instanceof Error ? err.message : `${err}`
			}`
		);
	}
};

interface XrpTokenPaymentState {
	senderLine: XrpTrustLine | undefined;
	// Not read for a payment to the issuer, which moves along the sender's line only.
	recipientLine: XrpTrustLine | undefined;
	issuerFlags: number;
	transferRate: number;
}

/**
 * What a token payment's checks read besides the two accounts: both holders' lines for the token,
 * and the issuer's flags and transfer rate — all from the validated ledger. A line is only ever
 * changed by its holder or the issuer, and the sender's own changes go through the in-flight guard.
 *
 * Any failure refuses the payment rather than signing it unchecked.
 */
const loadXrpTokenPaymentState = async ({
	network,
	source,
	destination,
	token: { currency, issuer }
}: {
	network: XrpNetworkType;
	source: XrpAddress;
	destination: XrpAddress;
	token: XrpTrustLineToken;
}): Promise<XrpTokenPaymentState> => {
	const lineFor = (lines: XrpTrustLine[]): XrpTrustLine | undefined =>
		lines.find((line) => line.currency === currency);

	try {
		const [senderLines, recipientLines, issuerInfo] = await Promise.all([
			loadXrpAccountLines({ address: source, network, peer: issuer }),
			destination === issuer
				? Promise.resolve([])
				: loadXrpAccountLines({ address: destination, network, peer: issuer }),
			loadXrpAccountInfo({ address: issuer, network, ledgerIndex: 'validated' })
		]);

		return {
			senderLine: lineFor(senderLines),
			recipientLine: lineFor(recipientLines),
			issuerFlags: issuerInfo.flags,
			transferRate: issuerInfo.transferRate ?? XRP_TRANSFER_RATE_NO_FEE
		};
	} catch (err: unknown) {
		throw new XrpPaymentRefusedError({
			refusal: 'state_unavailable',
			message: `XRP token payment refused: the token's lines or issuer could not be read. ${
				err instanceof Error ? err.message : `${err}`
			}`
		});
	}
};

/**
 * A token payment's own checks, and what it states: the amount and, when the issuer charges a
 * transfer fee, its cost as `SendMax`. Throws the refusal of the first check that fails.
 */
const toXrpTokenPaymentAmounts = ({
	amount,
	destination,
	token: { issuer },
	state,
	transferRate,
	destinationFlags
}: {
	amount: XrpBalance;
	destination: XrpAddress;
	token: XrpTrustLineToken;
	state: XrpTokenPaymentState | undefined;
	// The rate the review priced the payment with.
	transferRate: number | undefined;
	destinationFlags: number;
}): { value: string; sendMax?: string } => {
	if (isNullish(state)) {
		throw new XrpPaymentRefusedError({
			refusal: 'state_unavailable',
			message: "XRP token payment refused: the token's lines and issuer were not read."
		});
	}

	const { senderLine, recipientLine, issuerFlags, transferRate: currentRate } = state;

	const toIssuer = destination === issuer;
	const reviewedRate = transferRate ?? XRP_TRANSFER_RATE_NO_FEE;

	// The fee is charged between holders only, never to or from the issuer.
	if (!toIssuer && currentRate > reviewedRate) {
		throw new XrpPaymentRefusedError({
			refusal: 'transfer_rate_changed',
			message: `XRP token issuer ${issuer} charges a transfer rate of ${currentRate}, above the ${reviewedRate} the payment was reviewed with.`
		});
	}

	const sendMax = toIssuer ? undefined : getXrpTokenSendMax({ amount, transferRate: reviewedRate });

	const refusal = xrpTokenPaymentRefusal({
		amount,
		cost: sendMax ?? amount,
		senderLine,
		recipientLine,
		toIssuer,
		issuerFlags,
		destinationFlags
	});

	if (nonNullish(refusal)) {
		throw new XrpPaymentRefusedError({
			refusal,
			message: `XRP token payment of ${amount} to ${destination} refused: ${refusal}.`
		});
	}

	// Sending the whole balance states the ledger's own figure, so nothing below the wallet's scale
	// is left behind and the line can be removed afterwards.
	const wholeBalance =
		isNullish(sendMax) &&
		nonNullish(senderLine) &&
		parseXrpTokenValue({ value: senderLine.balance }) === amount;

	return {
		value: wholeBalance ? senderLine.balance : formatXrpTokenValue({ amount }),
		...(nonNullish(sendMax) && { sendMax: formatXrpTokenValue({ amount: sendMax }) })
	};
};

/**
 * Sends native XRP or a trust-line token: fetches the account sequence, whether the destination
 * exists and the current ledger index, builds and threshold-signs a Payment, records it, and
 * submits it.
 *
 * `fee` is a parameter rather than an estimate taken here, and that is the point: it is the figure
 * the amount was priced and reviewed against, so re-fetching it at signing time would sign a fee
 * the user never saw. Fee estimation and review belong to the caller; this function only bounds
 * what it is given.
 *
 * The destination read is what declines a payment too small to create an account that does not
 * exist yet — the ledger would apply that as `tecNO_DST_INSUF_XRP` and claim the fee.
 *
 * `amount` is in drops for XRP, and in the token's base units for a trust-line token. The caller is
 * responsible for having already reserved the account base and owner reserves out of the max XRP
 * amount (see `getXrpMaxAmount`).
 *
 * A token payment is refused before signing in every case the ledger would apply as a failure that
 * keeps the fee and that the lines and accounts involved can tell beforehand. `transferRate` is the
 * issuer's rate the review priced it with, and caps its cost: a higher rate at signing refuses it.
 *
 * `record` is the AUT the payment is recorded under, built after signing and before submitting —
 * the send's own `Xrp` AUT when it is omitted, or the swap's AUT when the payment is a swap's
 * deposit. Either way it holds the one-payment-in-flight invariant until the ledger resolves it.
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
	transferRate,
	record,
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
	transferRate?: number;
	record?: XrpPaymentRecordBuilder;
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
		// Every flag either snapshot sets, and the higher balance: what the DepositAuth check reads.
		flags: number;
		balance: XrpBalance;
		// Kept rather than thrown, because whether an unanswerable lookup matters depends on the
		// amount and only the guards know it.
		unavailable: Error | undefined;
	}

	// `flags` is a number on the `exists` branch, not an optional one: `Flags` is a mandatory
	// AccountRoot field, so a response without it fails the parse and lands on `error` — an
	// unanswerable lookup — rather than arriving here as a snapshot with nothing to say.
	type XrpDestinationRead =
		{ exists: true; flags: number; balance: XrpBalance } | { exists: false } | { error: Error };

	const readDestination = async (
		ledgerIndex: 'current' | 'validated'
	): Promise<XrpDestinationRead> => {
		try {
			const { flags, balance } = await loadXrpAccountInfo({
				address: destination,
				network,
				ledgerIndex
			});

			return { exists: true, flags, balance };
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
			flags: reads.reduce((flags, read) => ('flags' in read ? flags | read.flags : flags), 0),
			balance: reads.reduce(
				(balance, read) => ('balance' in read && read.balance > balance ? read.balance : balance),
				ZERO
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

	const tokenPayment = isTokenXrpTrustLine(token) ? token : undefined;

	// A token amount is stated as entered or not at all: one with more digits than the ledger keeps
	// would be rounded.
	if (nonNullish(tokenPayment) && !fitsXrpTokenPrecision(amount)) {
		throw new XrpPaymentRefusedError({
			refusal: 'imprecise_amount',
			message: `XRP token amount ${amount} has more significant digits than the ledger keeps.`
		});
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
	const recordIdentity = await assertNoXrpPaymentInFlight({ identity, source });

	// The signing key is deliberately NOT in here. Three guards below depend on these reads and so
	// cannot run before them, and `Promise.all` rejects on the first rejection — so a key failure
	// would win a race against whichever of those diagnoses was the useful one. A key mismatch is a
	// broken deployment; an insufficient balance is something the user can act on.
	// Both snapshots of the sender, because neither is safe alone, and every value below takes the
	// direction that cannot hurt: the higher sequence, the lower balance, the higher owner count.
	const [openAccount, validatedAccount, destinationLookup, ledgerIndex, tokenState] =
		await Promise.all([
			loadXrpAccountInfo({ address: source, network, ledgerIndex: 'current' }),
			loadXrpAccountInfo({ address: source, network, ledgerIndex: 'validated' }),
			tryDestination(),
			loadXrpLedgerIndex({ network }),
			nonNullish(tokenPayment)
				? loadXrpTokenPaymentState({ network, source, destination, token: tokenPayment })
				: undefined
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
	//
	// A token payment moves no XRP, so only the fee comes out of the XRP balance, and rippled takes
	// it even below the reserve.
	if (nonNullish(tokenPayment)) {
		if (balance < fee) {
			throw new XrpPaymentRefusedError({
				refusal: 'insufficient_xrp_for_fee',
				message: `XRP balance ${balance} drops cannot pay the ${fee} drops fee.`
			});
		}
	} else if (amount > getXrpMaxAmount({ balance, fee, ownerCount })) {
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
	//
	// A token payment cannot create an account at any amount: the ledger applies it as `tecNO_DST`.
	const requiresExistingDestination = nonNullish(tokenPayment) || amount < XRP_BASE_RESERVE_DROPS;

	if (requiresExistingDestination && nonNullish(destinationLookup.unavailable)) {
		throw nonNullish(tokenPayment)
			? new XrpPaymentRefusedError({
					refusal: 'state_unavailable',
					message: `XRP token payment refused: the destination ${destination} could not be read. ${destinationLookup.unavailable.message}`
				})
			: destinationLookup.unavailable;
	}

	if (nonNullish(tokenPayment) && !destinationLookup.settled) {
		throw new XrpPaymentRefusedError({
			refusal: 'destination_not_found',
			message: `XRP destination ${destination} does not exist in settled ledger state, and a token payment cannot create it.`
		});
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

	// A recipient with DepositAuth applies a payment from anyone it did not preauthorize as
	// `tecNO_PERMISSION`, fee claimed. Asked whenever a snapshot that was read sets the flag. A tagged
	// XRP payment whose destination could not be read at all goes ahead, as it does for an unknown tag
	// requirement: a node that cannot answer must not stop every well-funded send.
	//
	// Behind the trust-line flag, XRP payments included: with it off they behave as before, and the
	// endpoint is not asked a method its whitelist may not carry yet.
	if (
		XRP_TRUST_LINE_TOKENS_ENABLED &&
		xrpPaymentNeedsDepositPreauth({
			destinationFlags: destinationLookup.flags,
			destinationBalance: destinationLookup.balance,
			...(isNullish(tokenPayment) && { xrpAmount: amount })
		})
	) {
		let authorized: boolean;

		try {
			authorized = await loadXrpDepositAuthorized({ source, destination, network });
		} catch (err: unknown) {
			throw new XrpPaymentRefusedError({
				refusal: 'state_unavailable',
				message: `XRP payment refused: whether ${destination} takes deposits from ${source} could not be read. ${
					err instanceof Error ? err.message : `${err}`
				}`
			});
		}

		if (!authorized) {
			throw new XrpPaymentRefusedError({
				refusal: 'deposit_not_authorized',
				message: `XRP destination ${destination} takes payments only from accounts it preauthorized, and not from ${source}.`
			});
		}
	}

	// The token and what the payment states for it, together: a token payment is never built as an
	// XRP one, whose `Amount` would be read as drops.
	const tokenTransfer = nonNullish(tokenPayment)
		? {
				...toXrpTokenPaymentAmounts({
					amount,
					destination,
					token: tokenPayment,
					state: tokenState,
					transferRate,
					destinationFlags: destinationLookup.flags
				}),
				currency: tokenPayment.currency,
				issuer: tokenPayment.issuer
			}
		: undefined;

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

	const transaction: XrpPayment = nonNullish(tokenTransfer)
		? buildXrpTokenPayment({
				account: source,
				destination,
				amount: {
					currency: tokenTransfer.currency,
					issuer: tokenTransfer.issuer,
					value: tokenTransfer.value
				},
				...(nonNullish(tokenTransfer.sendMax) && {
					sendMax: {
						currency: tokenTransfer.currency,
						issuer: tokenTransfer.issuer,
						value: tokenTransfer.sendMax
					}
				}),
				fee,
				sequence,
				signingPublicKey,
				destinationTag,
				lastLedgerSequence
			})
		: buildXrpPayment({
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

	// Before the record, not after it — the row is created in this step, but reporting it after the
	// create would put an observer throw past the point where the row decides the send. The payment
	// would never be broadcast, yet the open row would refuse every send from this address for a
	// whole validity window and then resolve as an expiry. Here a throw still aborts with nothing
	// recorded and nothing sent, which is correct and must keep working.
	progress?.(ProgressStepsSendXrp.SEND);

	// After signing and before submitting, which is the only correct moment. Later would miss a
	// submit whose response is lost — precisely the case the record exists for. Earlier would be a
	// claim about a transaction that does not exist yet.
	const buildRecord =
		record ?? xrpSendRecord({ token, source, destination, destinationTag, amount, fee });

	await openXrpPaymentRecord({
		identity: recordIdentity,
		source,
		record: buildRecord({ txHash, lastLedgerSequence: signedLastLedgerSequence })
	});

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

	// Past this point the blob may be on the wire and the record is open, so a progress observer must
	// not be able to change what the caller is told. Unguarded, a throw at `RELOAD` or `DONE` reaches
	// the wizard's catch — which relies on only pre-broadcast failures getting there — and reports a
	// submitted payment as a failed send.
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

	// Deliberately no confirmation here. The record is the one confirmation path, and the poller
	// drives it — for this send and for one whose session died, on the same code. Waiting here as
	// well would mean two writers racing for a status the backend makes immutable, and would hold
	// the user for the whole validity window in the one case the record already covers.
	//
	// So these two steps report the broadcast finishing, NOT the payment landing. Nothing is
	// reloaded here either: at this point the payment has not validated, so there is nothing new to
	// read — the balance refresh belongs to the record's terminal side effects, which run when the
	// ledger has actually decided.
	reportPostBroadcastProgress(ProgressStepsSendXrp.RELOAD);
	reportPostBroadcastProgress(ProgressStepsSendXrp.DONE);

	return { txHash, submitResult };
};
