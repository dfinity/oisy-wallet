import { icTransactionsStatusStore } from '$icp/stores/ic-transactions-status.store';
import type { IcToken } from '$icp/types/ic-token';
import { IC_TRANSACTIONS_UNAVAILABLE_THRESHOLD } from '$lib/constants/app.constants';
import { enabledFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
import type { TokenId } from '$lib/types/token';
import type { TokenUi } from '$lib/types/token-ui';
import { qaLog } from '$lib/utils/simulated-canister-failures.utils';
import { derived, type Readable } from 'svelte/store';

/**
 * The enabled tokens whose transactions have failed to load often enough in a row that it is worth
 * warning the user about it.
 */
export const tokensWithUnavailableIndexCanister: Readable<IcToken[]> = derived(
	[enabledFungibleNetworkTokens, icTransactionsStatusStore],
	([$enabledFungibleNetworkTokens, $icTransactionsStatusStore]) => {
		const tokens = $enabledFungibleNetworkTokens
			.filter(
				({ id }) => ($icTransactionsStatusStore[id] ?? 0) >= IC_TRANSACTIONS_UNAVAILABLE_THRESHOLD
			)
			.map((token: TokenUi) => token as IcToken);

		// QA harness - DO NOT MERGE. Prints both sides: what is counted, and which of the enabled
		// tokens the count is matched against.
		if (Object.getOwnPropertySymbols($icTransactionsStatusStore).length > 0) {
			qaLog(
				'failure counts',
				Object.getOwnPropertySymbols($icTransactionsStatusStore).map(
					(id) => `${id.description}=${$icTransactionsStatusStore[id as TokenId]}`
				),
				`| threshold ${IC_TRANSACTIONS_UNAVAILABLE_THRESHOLD} | warned about`,
				tokens.map(({ symbol }) => symbol),
				`| enabled tokens counted against: ${$enabledFungibleNetworkTokens.length}`
			);
		}

		return tokens;
	}
);
