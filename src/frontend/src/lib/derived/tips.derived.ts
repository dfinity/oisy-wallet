import { ZERO } from '$lib/constants/app.constants';
import { tokens } from '$lib/derived/tokens.derived';
import { tipsStore } from '$lib/stores/tips.store';
import type { TokenId } from '$lib/types/token';
import { tipStatusKey } from '$lib/utils/tip-status.utils';
import { tippableTokens } from '$lib/utils/tip.utils';
import { isNullish } from '@dfinity/utils';
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
 * Only `Reserved` tips count. Claimed, cancelled and expired ones hold nothing:
 * the allowance is spent, revoked, or lapsed on the ledger.
 */
export const reservedTipAmounts: Readable<Record<TokenId, bigint>> = derived(
	[tipsStore, tokens],
	([$tipsStore, $tokens]) => {
		if (isNullish($tipsStore)) {
			return {} as Record<TokenId, bigint>;
		}

		const icTokens = tippableTokens($tokens);

		return $tipsStore.reduce<Record<TokenId, bigint>>((acc, tip) => {
			if (tipStatusKey(tip.status) !== 'reserved') {
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
