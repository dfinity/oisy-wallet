import { icTransactionsStatusStore } from '$icp/stores/ic-transactions-status.store';
import type { IcToken } from '$icp/types/ic-token';
import { isIcToken } from '$icp/validation/ic-token.validation';
import { IC_TRANSACTIONS_UNAVAILABLE_THRESHOLD } from '$lib/constants/app.constants';
import { enabledFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
import { derived, type Readable } from 'svelte/store';

// Only IC tokens can have a failing Index canister, and consumers identify them by their Ledger
// canister ID - which the other chains' tokens do not have. Narrow with the type guard rather than
// casting, so a non-IC token cannot reach a consumer reading `ledgerCanisterId`.
const enabledIcTokens: Readable<IcToken[]> = derived(
	[enabledFungibleNetworkTokens],
	([$enabledFungibleNetworkTokens]) => $enabledFungibleNetworkTokens.filter(isIcToken)
);

/**
 * The enabled tokens whose transactions have failed to load often enough in a row that it is worth
 * warning the user about it.
 */
export const tokensWithUnavailableIndexCanister: Readable<IcToken[]> = derived(
	[enabledIcTokens, icTransactionsStatusStore],
	([$enabledIcTokens, $icTransactionsStatusStore]) =>
		$enabledIcTokens.filter(
			({ id }) => ($icTransactionsStatusStore[id] ?? 0) >= IC_TRANSACTIONS_UNAVAILABLE_THRESHOLD
		)
);
