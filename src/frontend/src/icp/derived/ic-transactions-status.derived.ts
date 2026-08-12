import { icTransactionsStatusStore } from '$icp/stores/ic-transactions-status.store';
import { icTransactionsWarningStore } from '$icp/stores/ic-transactions-warning.store';
import type { IcToken } from '$icp/types/ic-token';
import { isIcToken } from '$icp/validation/ic-token.validation';
import { IC_TRANSACTIONS_UNAVAILABLE_THRESHOLD } from '$lib/constants/app.constants';
import { enabledFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
import type { TokenId } from '$lib/types/token';
import { qaLog } from '$lib/utils/simulated-canister-failures.utils';
import { derived, type Readable } from 'svelte/store';

// Only IC tokens can have a failing Index canister, and consumers identify them by their Ledger
// canister ID - which the other chains' tokens do not have. Narrow with the type guard rather than
// casting, so a non-IC token cannot reach a consumer reading `ledgerCanisterId`.
export const enabledIcTokens: Readable<IcToken[]> = derived(
	[enabledFungibleNetworkTokens],
	([$enabledFungibleNetworkTokens]) => $enabledFungibleNetworkTokens.filter(isIcToken)
);

/**
 * The enabled tokens whose transactions have failed to load often enough in a row that it is worth
 * warning the user about it.
 */
export const tokensWithUnavailableIndexCanister: Readable<IcToken[]> = derived(
	[enabledIcTokens, icTransactionsStatusStore],
	([$enabledIcTokens, $icTransactionsStatusStore]) => {
		const tokens = $enabledIcTokens.filter(
			({ id }) => ($icTransactionsStatusStore[id] ?? 0) >= IC_TRANSACTIONS_UNAVAILABLE_THRESHOLD
		);

		// Testing harness - DO NOT MERGE. Prints both sides: what is counted, and which of the enabled
		// tokens the count is matched against.
		if (Object.getOwnPropertySymbols($icTransactionsStatusStore).length > 0) {
			qaLog(
				'failure counts',
				Object.getOwnPropertySymbols($icTransactionsStatusStore).map(
					(id) => `${id.description}=${$icTransactionsStatusStore[id as TokenId]}`
				),
				`| threshold ${IC_TRANSACTIONS_UNAVAILABLE_THRESHOLD} | warned about`,
				tokens.map(({ symbol }) => symbol),
				`| enabled IC tokens counted against: ${$enabledIcTokens.length}`
			);
		}

		return tokens;
	}
);

/**
 * The enabled tokens whose transactions were fetched successfully at least once since the app
 * loaded — an entry of zero, as opposed to no entry at all.
 *
 * The distinction matters for anything that wants to react to a *recovery*: "not failing" is also
 * true of every token the wallet has yet to reach, which on a fresh page load is all of them.
 */
export const tokensWithRecoveredIndexCanister: Readable<IcToken[]> = derived(
	[enabledIcTokens, icTransactionsStatusStore],
	([$enabledIcTokens, $icTransactionsStatusStore]) =>
		$enabledIcTokens.filter(({ id }) => $icTransactionsStatusStore[id] === 0)
);

/**
 * The tokens the user should actually be warned about: failing, and not already acknowledged.
 *
 * Shared by the Activity page and the token page so that dismissing the warning in one silences it
 * in the other.
 */
export const tokensToWarnAboutIndexCanister: Readable<IcToken[]> = derived(
	[tokensWithUnavailableIndexCanister, icTransactionsWarningStore],
	([$tokensWithUnavailableIndexCanister, $icTransactionsWarningStore]) =>
		$tokensWithUnavailableIndexCanister.filter(
			({ ledgerCanisterId }) => !$icTransactionsWarningStore.includes(ledgerCanisterId)
		)
);
