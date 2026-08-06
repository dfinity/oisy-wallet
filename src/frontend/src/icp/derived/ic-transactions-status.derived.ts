import { icTransactionsStatusStore } from '$icp/stores/ic-transactions-status.store';
import type { IcToken } from '$icp/types/ic-token';
import { IC_TRANSACTIONS_UNAVAILABLE_THRESHOLD } from '$lib/constants/app.constants';
import { enabledFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
import type { TokenUi } from '$lib/types/token-ui';
import { derived, type Readable } from 'svelte/store';

/**
 * The enabled tokens whose transactions have failed to load often enough in a row that it is worth
 * warning the user about it.
 */
export const tokensWithUnavailableIndexCanister: Readable<IcToken[]> = derived(
	[enabledFungibleNetworkTokens, icTransactionsStatusStore],
	([$enabledFungibleNetworkTokens, $icTransactionsStatusStore]) =>
		$enabledFungibleNetworkTokens
			.filter(
				({ id }) => ($icTransactionsStatusStore[id] ?? 0) >= IC_TRANSACTIONS_UNAVAILABLE_THRESHOLD
			)
			.map((token: TokenUi) => token as IcToken)
);

/**
 * The enabled tokens whose transactions were fetched successfully at least once since the app
 * loaded — an entry of zero, as opposed to no entry at all.
 *
 * The distinction matters for anything that wants to react to a *recovery*: "not failing" is also
 * true of every token the wallet has yet to reach, which on a fresh page load is all of them.
 */
export const tokensWithRecoveredIndexCanister: Readable<IcToken[]> = derived(
	[enabledFungibleNetworkTokens, icTransactionsStatusStore],
	([$enabledFungibleNetworkTokens, $icTransactionsStatusStore]) =>
		$enabledFungibleNetworkTokens
			.filter(({ id }) => $icTransactionsStatusStore[id] === 0)
			.map((token: TokenUi) => token as IcToken)
);
