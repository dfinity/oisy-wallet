import type { Token } from '$lib/types/token';
import { getTokenIdentifier } from '$lib/utils/identifier.utils';
import {
	hiddenInfoQualifiers,
	saveHideInfoQualifiers,
	type HideInfoKey
} from '$lib/utils/info.utils';
import type {
	SolUnreadableTransaction,
	SolUnreadableTransactionsWarning
} from '$sol/types/sol-transaction';
import { get, writable, type Readable } from 'svelte/store';

const UNSUPPORTED_TRANSACTIONS_HIDE_KEY: HideInfoKey = 'oisy_sol_hide_unsupported_transactions';

/**
 * What a dismissal records: one transaction missing from one token's history, so that dismissing a
 * token's warning silences neither the next transaction it misses nor the same transaction missing
 * from another token's history.
 *
 * Recorded by the token's mint, none for SOL, never by its id, which the reload the session storage
 * outlives creates anew. The signature already names the network.
 */
export const solUnreadableTransactionDismissal = ({
	token,
	signature
}: {
	token: Token;
	signature: SolUnreadableTransaction['signature'];
}): string => `${signature}:${getTokenIdentifier(token) ?? ''}`;

interface SolUnreadableTransactionsWarningStore extends Readable<string[]> {
	dismiss: (warnings: SolUnreadableTransactionsWarning[]) => void;
	reset: () => void;
}

/**
 * The dismissals of the warning about Solana transactions OISY cannot read yet.
 *
 * A store rather than component state for the same reason as the IC warning's: the warning is
 * raised on the Activity page and on the token page, and dismissing it in one has to silence the
 * other at once.
 */
const initSolUnreadableTransactionsWarningStore = (): SolUnreadableTransactionsWarningStore => {
	const store = writable<string[]>(hiddenInfoQualifiers(UNSUPPORTED_TRANSACTIONS_HIDE_KEY));

	const { subscribe, set } = store;

	// Written through on every change, so the dismissal survives a reload within the session.
	const save = (dismissals: string[]): string[] => {
		saveHideInfoQualifiers({ key: UNSUPPORTED_TRANSACTIONS_HIDE_KEY, qualifiers: dismissals });

		return dismissals;
	};

	return {
		subscribe,

		// A no-op when nothing is new: writing an equal array would still write through to session
		// storage and notify every subscriber.
		dismiss: (warnings) => {
			const dismissed = get(store);

			const added = [
				...new Set(
					warnings.flatMap(({ token, signatures }) =>
						signatures.map((signature) => solUnreadableTransactionDismissal({ token, signature }))
					)
				)
			].filter((dismissal) => !dismissed.includes(dismissal));

			if (added.length === 0) {
				return;
			}

			set(save([...dismissed, ...added]));
		},

		reset: () => set(save([]))
	};
};

export const solUnreadableTransactionsWarningStore = initSolUnreadableTransactionsWarningStore();
