import { enabledFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
import {
	solUnreadableTransactionDismissal,
	solUnreadableTransactionsWarningStore
} from '$sol/stores/sol-unreadable-transactions-warning.store';
import { solUnreadableTransactionsStore } from '$sol/stores/sol-unreadable-transactions.store';
import type { SolUnreadableTransactionsWarning } from '$sol/types/sol-transaction';
import { isSolanaToken } from '$sol/utils/token.utils';
import { derived, type Readable } from 'svelte/store';

/**
 * The enabled Solana tokens whose history misses transactions OISY cannot read yet, each with
 * those of them whose warning the user has not dismissed.
 *
 * Shared by the Activity page and the token page, so that dismissing the warning in one silences it
 * in the other.
 */
export const solUnreadableTransactionsWarnings: Readable<SolUnreadableTransactionsWarning[]> =
	derived(
		[
			enabledFungibleNetworkTokens,
			solUnreadableTransactionsStore,
			solUnreadableTransactionsWarningStore
		],
		([$enabledFungibleNetworkTokens, $solUnreadableTransactions, $dismissals]) =>
			$enabledFungibleNetworkTokens
				.filter(isSolanaToken)
				.reduce<SolUnreadableTransactionsWarning[]>((acc, token) => {
					const signatures = ($solUnreadableTransactions[token.id] ?? []).filter(
						(signature) =>
							!$dismissals.includes(solUnreadableTransactionDismissal({ token, signature }))
					);

					return signatures.length > 0 ? [...acc, { token, signatures }] : acc;
				}, [])
	);
