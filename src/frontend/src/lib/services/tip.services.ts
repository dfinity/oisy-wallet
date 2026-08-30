import type { MyTip, PublicTip, TipClaim, TipDetails } from '$declarations/backend/backend.did';
import { approve } from '$icp/api/icrc-ledger.api';
import {
	cancelTip as cancelTipApi,
	claimTip as claimTipApi,
	createTip as createTipApi,
	getMyTips,
	getTip,
	getTipDetails,
	getTipSecret,
	setTipSecret
} from '$lib/api/backend.api';
import { BACKEND_CANISTER_ID, ZERO } from '$lib/constants/app.constants';
import {
	claimCodeHash,
	generateClaimCode,
	generateTipId,
	tipSpenderSubaccount
} from '$lib/services/tip.crypto';
import { decryptClaimCode, encryptClaimCode } from '$lib/services/tip.vetkeys';
import type { CanisterIdText } from '$lib/types/canister';
import { consoleError, consoleWarn } from '$lib/utils/console.utils';
import { isNullish, toNullable } from '@dfinity/utils';
import { AnonymousIdentity, type Identity } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';

/** The recipient route a tip link points at. */
const TIP_LINK_PATH = '/tip';

/** The fragment key carrying the claim code, e.g. `#c=Ab3…`. */
const CLAIM_CODE_FRAGMENT_KEY = 'c';

/** The fragment key carrying the tip id, e.g. `#i=tip-7…`. */
const TIP_ID_FRAGMENT_KEY = 'i';

/**
 * The two values that identify a tip, generated before anything is sent
 * anywhere.
 *
 * Held by the caller rather than generated inside {@link reserveTip} so that a
 * retry can reuse them — which is what makes creating a tip idempotent. See
 * {@link reserveTip}.
 */
export interface TipDraft {
	tipId: string;
	claimCode: string;
}

export const newTipDraft = (): TipDraft => ({
	tipId: generateTipId(),
	claimCode: generateClaimCode()
});

/**
 * The shareable link. The claim code goes in the **fragment**, which browsers
 * never send to a server — so the code reaches the recipient without ever
 * touching the canister or any log along the way.
 */
export const buildTipLink = ({ tipId, claimCode }: TipDraft): string =>
	`${window.location.origin}${TIP_LINK_PATH}#${TIP_ID_FRAGMENT_KEY}=${tipId}&${CLAIM_CODE_FRAGMENT_KEY}=${claimCode}`;

/**
 * Reads a value back out of a link fragment, tolerating a leading `#` and other
 * fragment parameters. Returns `undefined` for a missing or empty value — which
 * is the "link was truncated on the way here" case, not an error worth throwing
 * over.
 */
const parseFragmentKey = ({
	fragment,
	key
}: {
	fragment: string;
	key: string;
}): string | undefined => {
	const params = new URLSearchParams(fragment.startsWith('#') ? fragment.slice(1) : fragment);
	const value = params.get(key);
	return value === null || value === '' ? undefined : value;
};

/**
 * Reads the tip id back out of a link fragment.
 *
 * The id lives in the fragment rather than the path so that the shared URL is
 * plain `/tip` — a path that can be prerendered, which is the only way the link
 * gets its own preview card. A crawler fetching `/tip` for a preview cannot see
 * either value, and neither can the boundary node: the fragment is the one part
 * of a URL a browser never puts on the wire.
 */
export const parseTipIdFromFragment = (fragment: string): string | undefined =>
	parseFragmentKey({ fragment, key: TIP_ID_FRAGMENT_KEY });

/**
 * Reads the claim code back out of a link fragment.
 */
export const parseClaimCodeFromFragment = (fragment: string): string | undefined =>
	parseFragmentKey({ fragment, key: CLAIM_CODE_FRAGMENT_KEY });

/**
 * The ledger's own reason for refusing an approve, dug out of the client
 * library's error.
 *
 * `IcrcTransferError` carries the candid variant on `errorType` and then reports
 * a fixed message that names none of it. This reads the variant's key back out —
 * `InsufficientFunds`, `BadFee`, `AllowanceChanged`, `Duplicate`, `TooOld`,
 * `CreatedInFuture`, `Expired`, `TemporarilyUnavailable`, `GenericError` — along
 * with whatever the variant carries, since the payload is the useful half
 * (`InsufficientFunds` reports the balance, `BadFee` the expected fee).
 */
const approveRefusal = (err: unknown): string => {
	const errorType = (err as { errorType?: unknown })?.errorType;

	if (isNullish(errorType) || typeof errorType !== 'object') {
		return err instanceof Error ? err.message : `${err}`;
	}

	const [variant] = Object.entries(errorType as Record<string, unknown>);

	if (isNullish(variant)) {
		return 'unrecognised ledger error';
	}

	const [name, payload] = variant;

	return `${name} ${JSON.stringify(payload, (_, value) => (typeof value === 'bigint' ? `${value}` : value))}`;
};

/**
 * The rate limit a tip call ran into, if that is why it failed.
 *
 * Every tips endpoint answers `TipError::RateLimited(RateLimitError)` carrying
 * the ceiling it enforces and the window it enforces it over, and nothing on
 * this side was reading it — so being turned away looked exactly like the call
 * failing, and every screen said "try again", which is the one thing that
 * cannot work while a limit is still in force.
 *
 * The vetKey derivation is the limit most likely to be met in ordinary use: it
 * is metered at roughly 26 billion cycles a call, so its per-caller ceiling is
 * deliberately low and a sender recovering several links in a row can reach it
 * without doing anything wrong.
 */
export const tipRateLimit = (
	err: unknown
): { maxCalls: number; windowSeconds: bigint } | undefined => {
	const limit = (err as { RateLimited?: { max_calls?: number; window_ns?: bigint } })?.RateLimited;

	if (isNullish(limit) || isNullish(limit.max_calls) || isNullish(limit.window_ns)) {
		return undefined;
	}

	return {
		maxCalls: limit.max_calls,
		// Nanoseconds are the canister's unit, not a unit anyone can be told to
		// wait in.
		windowSeconds: limit.window_ns / 1_000_000_000n
	};
};

/** How long to wait before the one retry of the claim-code write. */
const SECRET_RETRY_DELAY_MS = 1_500;

/**
 * Stores the recoverable copy of a claim code, and says whether it worked.
 *
 * Deliberately after the tip exists, and it never throws: the reservation has
 * already succeeded, so a failure here must not look like a failed tip. But it
 * is no longer silent either. It returns `false` so the caller can tell the
 * sender to copy the link now, which is the only moment the link still exists —
 * a failure here used to cost that tip its recoverable link permanently, with
 * nothing on screen and only a console line to say so.
 *
 * Retried once, because the causes seen in the wild are transient: a boundary
 * node returning 503, or a rate limit that a moment's wait clears. Only once,
 * and only the write: an `encryptClaimCode` that fails may have spent a vetKD
 * derivation, and hammering a metered endpoint is how a blip becomes an outage.
 */
const storeClaimCode = async ({
	identity,
	draft
}: {
	identity: Identity;
	draft: TipDraft;
}): Promise<boolean> => {
	// Encrypted once, outside the retry. The comment above always said the retry
	// was "only the write", but the derivation sat inside `attempt` and went
	// round again with it — so a vetKD failure re-spent a metered call 1.5
	// seconds later, which is the opposite of what was intended.
	let ciphertext: Uint8Array;

	try {
		ciphertext = await encryptClaimCode({
			claimCode: draft.claimCode,
			tipId: draft.tipId,
			identity
		});
	} catch (err: unknown) {
		consoleWarn('Could not encrypt the recoverable claim code for this tip', err);

		return false;
	}

	const attempt = async (): Promise<void> => {
		await setTipSecret({
			identity,
			tip_id: draft.tipId,
			encrypted_claim_code: ciphertext
		});
	};

	try {
		await attempt();

		return true;
	} catch (err: unknown) {
		consoleWarn('Could not store the recoverable claim code for this tip, retrying', err);
	}

	await new Promise((resolve) => setTimeout(resolve, SECRET_RETRY_DELAY_MS));

	try {
		await attempt();

		return true;
	} catch (err: unknown) {
		// The sender keeps their tip and their money either way. What they lose is
		// the ability to find this link again, which is why the caller is told.
		consoleWarn('Gave up storing the recoverable claim code for this tip', err);

		return false;
	}
};

/**
 * Reserves a tip: approves the backend canister for it on the ledger, then
 * records it.
 *
 * **No tokens move here, and the canister takes no custody.** The approve
 * authorises the canister to spend `amount + fee` from the sender's own account,
 * under a subaccount derived from this tip's id — so the authorisation is usable
 * for this tip and nothing else. If nobody claims, it simply lapses.
 *
 * **Why `amount + fee`, and who pays it.** The ledger charges the transfer fee
 * to the *allowance* and credits the claimer the amount in full, so a
 * reservation of exactly `amount` cannot be claimed. The sender therefore pays
 * two fees — this approve, and the payout when someone claims — and the claimer
 * pays none. Both numbers belong in the sender's confirmation UI.
 *
 * **Retrying is safe.** Pass the same `draft` again: the tip id is unchanged, so
 * the approve targets the same subaccount and *replaces* the same allowance
 * rather than adding to it, and the create either succeeds or fails
 * `DuplicateTipId` because the first attempt already landed. This is why the
 * draft is the caller's to hold — generating a fresh one on retry would strand
 * the first allowance until it expired.
 *
 * Returns `secretStored: false` when the recoverable copy of the claim code
 * could not be saved. The tip is real and claimable either way; what the sender
 * loses is the ability to find this link again, so the screen has to say so
 * while the link is still in front of them.
 *
 * **The deadline is the caller's too.** It used to be derived here from a
 * duration, which meant the only way to learn it was to wait for this whole
 * function to finish — and the share screen needs it to draw anything at all. The
 * caller now decides it, so it can show the screen while this is still running.
 */
export const reserveTip = async ({
	identity,
	draft,
	ledgerCanisterId,
	amount,
	fee,
	expiresAtNs,
	message
}: {
	identity: Identity;
	draft: TipDraft;
	ledgerCanisterId: CanisterIdText;
	amount: bigint;
	fee: bigint;
	expiresAtNs: bigint;
	message?: string;
}): Promise<{ link: string; secretStored: boolean }> => {
	const subaccount = await tipSpenderSubaccount(draft.tipId);

	try {
		await approve({
			identity,
			ledgerCanisterId,
			amount: amount + fee,
			spender: {
				owner: Principal.fromText(BACKEND_CANISTER_ID),
				subaccount
			},
			expiresAt: expiresAtNs
		});
	} catch (err: unknown) {
		// The ledger says exactly why an approve was refused — `InsufficientFunds`
		// with the balance, `BadFee` with the expected fee, `Duplicate`, `TooOld`,
		// `CreatedInFuture`, `Expired` — but the client library discards all of it
		// behind one fixed sentence, "Failed to entitle the spender to transfer the
		// amount", and that sentence is the only thing that reached the console.
		//
		// Reserving is the sender's first step and the one that touches their money,
		// so a refusal that cannot be told apart from any other refusal is the worst
		// place in the feature to be blind. Logged, then rethrown untouched so the
		// existing handling is unchanged.
		consoleError('Ledger refused the tip approval', {
			reason: approveRefusal(err),
			ledgerCanisterId,
			// The reservation is amount + fee; a balance that covers neither is the
			// most common answer, and needs both numbers to be recognised as such.
			amount: `${amount}`,
			fee: `${fee}`
		});

		throw err;
	}

	await createTipApi({
		identity,
		tip_id: draft.tipId,
		ledger_canister_id: Principal.fromText(ledgerCanisterId),
		amount,
		expires_at_ns: expiresAtNs,
		message: toNullable(message),
		claim_code_hash: await claimCodeHash(draft.claimCode)
	});

	return { link: buildTipLink(draft), secretStored: await storeClaimCode({ identity, draft }) };
};

/**
 * Rebuilds the share link for one of the sender's own tips.
 *
 * `undefined` when no ciphertext is stored — a tip created before the recovery
 * store existed, or one whose secret was dropped when it was cancelled. The
 * caller shows "no longer available" rather than an error, because neither case
 * is a fault.
 */
export const recoverTipLink = async ({
	identity,
	tipId
}: {
	identity: Identity;
	tipId: string;
}): Promise<string | undefined> => {
	const encrypted = await getTipSecret({ identity, tipId });

	if (isNullish(encrypted)) {
		return undefined;
	}

	const claimCode = await decryptClaimCode({
		encrypted: encrypted instanceof Uint8Array ? encrypted : Uint8Array.from(encrypted),
		tipId,
		identity
	});

	return buildTipLink({ tipId, claimCode });
};

/**
 * The anonymous preview a recipient sees before signing in: amount, token and
 * deadline, and deliberately nothing about the sender or the message.
 */
export const loadTipPreview = ({ tipId }: { tipId: string }): Promise<PublicTip> =>
	getTip({ identity: new AnonymousIdentity(), tipId });

/** The claim review, which requires the claim code from the link fragment. */
export const loadTipDetails = ({
	identity,
	tipId,
	claimCode
}: {
	identity: Identity;
	tipId: string;
	claimCode: string;
}): Promise<TipDetails> => getTipDetails({ identity, tip_id: tipId, claim_code: claimCode });

/**
 * Claims a tip into the caller's wallet. The caller needs an identity but not a
 * user profile — a first-time visitor claiming is the point of the feature.
 */
export const claimTip = ({
	identity,
	tipId,
	claimCode
}: {
	identity: Identity;
	tipId: string;
	claimCode: string;
}): Promise<TipClaim> => claimTipApi({ identity, tip_id: tipId, claim_code: claimCode });

/**
 * Cancels an unclaimed tip of the caller's, and revokes its allowance.
 *
 * Both halves matter and they are ordered deliberately: the canister first stops
 * the tip being claimable, and only then is the allowance revoked. Revoking
 * first would leave a window where the tip still looks live but cannot pay out —
 * an `Uncovered` failure the sender caused and the recipient cannot explain.
 */
export const cancelTip = async ({
	identity,
	tipId,
	ledgerCanisterId
}: {
	identity: Identity;
	tipId: string;
	ledgerCanisterId: CanisterIdText;
}): Promise<void> => {
	await cancelTipApi({ identity, tipId });

	await approve({
		identity,
		ledgerCanisterId,
		amount: ZERO,
		spender: {
			owner: Principal.fromText(BACKEND_CANISTER_ID),
			subaccount: await tipSpenderSubaccount(tipId)
		},
		// An allowance of zero has nothing to expire; the ledger still requires the
		// field, so this is the same deadline the reservation already carried.
		expiresAt: BigInt(Date.now()) * 1_000_000n + 60_000_000_000n
	});
};

/** The caller's own tips, newest first, for History. */
export const loadMyTips = ({ identity }: { identity: Identity }): Promise<MyTip[]> =>
	getMyTips({ identity });
