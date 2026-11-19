/**
 * A tip link that has been opened by someone signed in, handed from the claim
 * route to the wallet so the claim itself happens *inside* the app.
 *
 * Both fields are needed: the id names the tip, the code proves the holder has
 * its link. That is the whole authorisation, which is why this never goes
 * anywhere but memory — not the URL the wallet ends up on, not storage. Losing
 * it (a reload mid-flight, say) costs nothing except the claim not happening:
 * nothing has been consumed at that point and the link still works.
 */
export interface PendingTipClaim {
	tipId: string;
	claimCode: string;
}

/**
 * Why a claim did not pay out. A dead link and a live tip that could not be paid
 * mean very different things about whether the sender needs telling, and
 * `shortBalance` is the one the sender can actually fix.
 */
export type TipClaimOutcome = 'unavailable' | 'uncovered' | 'shortBalance' | 'failed';
