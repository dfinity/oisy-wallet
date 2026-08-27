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
import { consoleWarn } from '$lib/utils/console.utils';
import { isNullish, toNullable } from '@dfinity/utils';
import { AnonymousIdentity, type Identity } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';

/** The recipient route a tip link points at. */
const TIP_LINK_PATH = '/tip';

/** The fragment key carrying the claim code, e.g. `#c=Ab3…`. */
const CLAIM_CODE_FRAGMENT_KEY = 'c';

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
	`${window.location.origin}${TIP_LINK_PATH}/${tipId}#${CLAIM_CODE_FRAGMENT_KEY}=${claimCode}`;

/**
 * Reads the claim code back out of a link fragment, tolerating a leading `#`
 * and other fragment parameters. Returns `undefined` when the fragment carries
 * no code — which is the "link was truncated on the way here" case, not an
 * error worth throwing over.
 */
export const parseClaimCodeFromFragment = (fragment: string): string | undefined => {
	const params = new URLSearchParams(fragment.startsWith('#') ? fragment.slice(1) : fragment);
	const code = params.get(CLAIM_CODE_FRAGMENT_KEY);
	return code === null || code === '' ? undefined : code;
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
}): Promise<{ link: string }> => {
	const subaccount = await tipSpenderSubaccount(draft.tipId);

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

	await createTipApi({
		identity,
		tip_id: draft.tipId,
		ledger_canister_id: Principal.fromText(ledgerCanisterId),
		amount,
		expires_at_ns: expiresAtNs,
		message: toNullable(message),
		claim_code_hash: await claimCodeHash(draft.claimCode)
	});

	// Best-effort, and deliberately after the tip exists: this is a convenience
	// so the sender can find the link again, and a failure here must not look
	// like a failed reservation — the tip is real and the link is on screen. The
	// canister cannot read what it stores.
	try {
		await setTipSecret({
			identity,
			tip_id: draft.tipId,
			encrypted_claim_code: await encryptClaimCode({
				claimCode: draft.claimCode,
				tipId: draft.tipId,
				identity
			})
		});
	} catch (err: unknown) {
		consoleWarn('Could not store the recoverable claim code for this tip', err);
	}

	return { link: buildTipLink(draft) };
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
