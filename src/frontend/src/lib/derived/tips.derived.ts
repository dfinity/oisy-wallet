import { ZERO } from '$lib/constants/app.constants';
import { exchanges } from '$lib/derived/exchange.derived';
import { tokens } from '$lib/derived/tokens.derived';
import { tipsStore } from '$lib/stores/tips.store';
import type { TokenId } from '$lib/types/token';
import { usdValue } from '$lib/utils/exchange.utils';
import { tipStatusKey } from '$lib/utils/tip-status.utils';
import { tippableTokens } from '$lib/utils/tip.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

/**
 * How much of each token the user's live tips have promised away, keyed by token.
 *
 * **Amount plus one fee, not just the amount.** The reservation the sender
 * granted is `amount + fee`, because the ledger charges the payout fee to the
 * allowance. Subtracting only the amount would let someone spend down to where
 * their own tip can no longer be claimed — a failure the recipient sees as
 * `Uncovered`, caused by our arithmetic rather than by anything they did.
 *
 * `Reserved` **and** `Failed` count. A failed tip is one somebody tried to claim
 * and could not: its allowance is still granted and its code still works, so it
 * encumbers the balance exactly as a untouched one does — and it is the case
 * where the sender most needs the number to be right, since topping up is the
 * fix. Claimed, cancelled and expired tips hold nothing: the allowance is spent,
 * revoked, or lapsed on the ledger.
 */
export const reservedTipAmounts: Readable<Record<TokenId, bigint>> = derived(
	[tipsStore, tokens],
	([$tipsStore, $tokens]) => {
		if (isNullish($tipsStore)) {
			return {} as Record<TokenId, bigint>;
		}

		const icTokens = tippableTokens($tokens);

		return $tipsStore.reduce<Record<TokenId, bigint>>((acc, tip) => {
			if (!['reserved', 'failed'].includes(tipStatusKey(tip.status))) {
				return acc;
			}

			const token = icTokens.find(
				({ ledgerCanisterId }) => ledgerCanisterId === tip.ledger_canister_id.toText()
			);

			if (isNullish(token)) {
				// A tip in a token the user has since disabled still encumbers their
				// balance, but there is no token id to attribute it to here. The
				// canister's own coverage check remains the backstop.
				return acc;
			}

			return {
				...acc,
				[token.id]: (acc[token.id] ?? ZERO) + tip.amount + token.fee
			};
		}, {});
	}
);

/**
 * What the sender's tips add up to, for the summary on the tips intro screen.
 *
 * Everything here comes from the one `get_my_tips` call the app already makes on
 * sign-in, so the screen costs nothing extra to draw.
 *
 * Two honest limits worth knowing when reading these numbers:
 *
 * - The window is not all-time. `get_my_tips` returns at most
 *   `MAX_TIPS_RETURNED` rows, and a finished tip is pruned once its retention
 *   window passes, so this covers recent activity rather than a lifetime total.
 * - The fiat figures cover only tokens a rate has loaded for. A tip in an
 *   unpriced token still counts toward the counts and is simply absent from the
 *   money, which is why the counts lead and the money follows.
 *
 * `failed` is the one that earns its place: it is the only group the sender can
 * act on, and without it a tip nobody could claim looks exactly like a tip
 * nobody has tried yet.
 */
export interface TipsOverview {
	failed: number;
	open: number;
	claimed: number;
	openUsd: number;
	claimedUsd: number;
	hasAny: boolean;
}

export const tipsOverview: Readable<TipsOverview> = derived(
	[tipsStore, tokens, exchanges],
	([$tipsStore, $tokens, $exchanges]) => {
		const empty: TipsOverview = {
			failed: 0,
			open: 0,
			claimed: 0,
			openUsd: 0,
			claimedUsd: 0,
			hasAny: false
		};

		if (isNullish($tipsStore) || $tipsStore.length === 0) {
			return empty;
		}

		const icTokens = tippableTokens($tokens);

		return $tipsStore.reduce<TipsOverview>(
			(acc, tip) => {
				const status = tipStatusKey(tip.status);
				const token = icTokens.find(
					({ ledgerCanisterId }) => ledgerCanisterId === tip.ledger_canister_id.toText()
				);
				const exchangeRate = nonNullish(token) ? $exchanges?.[token.id]?.usd : undefined;
				const usd =
					nonNullish(token) && nonNullish(exchangeRate)
						? usdValue({ decimals: token.decimals, balance: tip.amount, exchangeRate })
						: 0;

				if (status === 'failed') {
					return { ...acc, failed: acc.failed + 1, openUsd: acc.openUsd + usd };
				}

				if (status === 'reserved') {
					return { ...acc, open: acc.open + 1, openUsd: acc.openUsd + usd };
				}

				if (status === 'claimed') {
					return { ...acc, claimed: acc.claimed + 1, claimedUsd: acc.claimedUsd + usd };
				}

				// Expired and cancelled tips are counted by `hasAny` only. Nothing moved
				// and nothing is held, so a figure for them would be money that never
				// went anywhere.
				return acc;
			},
			{ ...empty, hasAny: true }
		);
	}
);
