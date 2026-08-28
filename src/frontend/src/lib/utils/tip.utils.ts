import type { IcToken } from '$icp/types/ic-token';
import { isTokenIcp, isTokenIcrc } from '$icp/utils/icrc.utils';
import type { Token } from '$lib/types/token';

/**
 * The tokens a tip can be issued in.
 *
 * The filter is structural, not a policy we picked: a tip is an ICRC-2
 * allowance, so it only works on ledgers that *have* an allowance primitive —
 * ICP and the ck-assets. A native BTC, ETH or SOL balance cannot be reserved
 * without someone taking custody of it, which is the one thing this feature is
 * built to avoid.
 *
 * Narrowing to `IcToken` is deliberate: the sender's approve needs the token's
 * `ledgerCanisterId`, which only the IC token type carries.
 */
export const tippableTokens = (tokens: Token[]): IcToken[] =>
	tokens.filter((token): token is IcToken => isTokenIcp(token) || isTokenIcrc(token));

/**
 * The two fees a tip costs its sender, both one ledger fee.
 *
 * There are two because the flow touches the ledger twice: once to reserve
 * (`icrc2_approve`) and once when someone claims (`icrc2_transfer_from`). The
 * ledger charges the second to the sender's balance while crediting the claimer
 * the full amount — so the claimer pays nothing, and the sender's spendable
 * balance has to account for both. Measured against a real ledger in the spec's
 * PR-0 spike rather than inferred.
 */
export const tipFees = (fee: bigint): { reserve: bigint; payout: bigint; total: bigint } => ({
	reserve: fee,
	payout: fee,
	total: fee * 2n
});

/**
 * Whether this principal has already been shown the post-claim welcome.
 *
 * Keyed by principal rather than a single flag, because one browser is shared:
 * a waiter claiming tips on a house tablet would otherwise burn the welcome on
 * the first person and show nobody else. Not keyed by tip — the point is to
 * explain OISY once, not once per tip.
 *
 * `localStorage` is the right amount of durability here. Losing it shows a
 * returning claimer an intro they have seen, which is mildly redundant; storing
 * it on the canister would spend a call on something that only affects one
 * screen. Every access is guarded because storage throws rather than returns in
 * some privacy modes, and a modal is never worth failing a claim over.
 */
const TIP_WELCOME_SEEN_KEY = 'oisy-tip-welcome-seen';

const welcomeSeenKey = (principal: string): string => `${TIP_WELCOME_SEEN_KEY}:${principal}`;

export const hasSeenTipWelcome = (principal: string): boolean => {
	try {
		return localStorage.getItem(welcomeSeenKey(principal)) !== null;
	} catch (_: unknown) {
		// Unreadable storage is treated as "already seen": a claimer who cannot be
		// remembered would otherwise meet the same intro on every single claim.
		return true;
	}
};

export const rememberTipWelcomeSeen = (principal: string): void => {
	try {
		localStorage.setItem(welcomeSeenKey(principal), '1');
	} catch (_: unknown) {
		// Nothing to do. Worst case the intro appears again next time.
	}
};
