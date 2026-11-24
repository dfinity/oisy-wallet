/**
 * The two secrets a tip is built from, and the hashes derived from them.
 *
 * A tip has an **id**, which is public (it is the `<id>` in the link path and
 * the canister's map key), and a **claim code**, which is not: it lives in the
 * link fragment, which browsers never put on the wire — so it stays out of
 * request paths, referrer headers and web-server logs, and only its SHA-256 is
 * stored by the canister.
 *
 * It is *not* secret from the canister at redemption: claiming sends the code
 * itself in an update call, because hashing it there is the only way to check
 * it. What the fragment buys is that the code never travels as a URL anyone
 * else logs, not that it is never transmitted.
 * Anyone holding the full link can claim; anyone holding just the id cannot.
 *
 * Both hashes here must agree byte-for-byte with the canister
 * (`src/backend/src/tips/model.rs`): the claim-code hash is what a claim is
 * checked against, and the spender subaccount is the account the canister will
 * try to spend from. A mismatch in either would not fail loudly — it would look
 * like a tip nobody can claim.
 */

import { randomBase64Url } from '$lib/utils/base64url.utils';

/** 128 bits, matching the note-share token and the canister's `MAX_TIP_ID_BYTES` headroom. */
const TIP_ID_LENGTH_BYTES = 16;

/**
 * 128 bits of claim code. This is the only thing standing between a leaked
 * `<id>` and someone else's money, so it is sized like a key, not like a PIN.
 */
const CLAIM_CODE_LENGTH_BYTES = 16;

const textEncoder = new TextEncoder();

const sha256 = async (value: string): Promise<Uint8Array<ArrayBuffer>> =>
	new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(textEncoder.encode(value))));

export const generateTipId = (): string => randomBase64Url(TIP_ID_LENGTH_BYTES);

export const generateClaimCode = (): string => randomBase64Url(CLAIM_CODE_LENGTH_BYTES);

/**
 * SHA-256 of the claim code's UTF-8 bytes — the only form of the code the
 * canister ever sees, and what `claim_tip` compares a submitted code against.
 */
export const claimCodeHash = (claimCode: string): Promise<Uint8Array<ArrayBuffer>> =>
	sha256(claimCode);

/**
 * The tip's spender subaccount: SHA-256 of the tip id.
 *
 * This is what scopes the allowance to one tip. The sender approves the backend
 * canister *at this subaccount*, so the resulting allowance can pay out this tip
 * and no other — which is what lets the canister spend on a sender's behalf
 * without ever holding their tokens.
 */
export const tipSpenderSubaccount = (tipId: string): Promise<Uint8Array<ArrayBuffer>> =>
	sha256(tipId);
