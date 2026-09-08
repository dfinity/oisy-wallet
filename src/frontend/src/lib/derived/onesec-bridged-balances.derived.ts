import { ONESEC_SWAP_ENABLED } from '$env/rest/onesec.env';
import { ZERO } from '$lib/constants/app.constants';
import { ONESEC_EVM_NETWORK_IDS } from '$lib/constants/swap.constants';
import { enabledFungibleTokens } from '$lib/derived/tokens.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { Token } from '$lib/types/token';
import { isOneSecWrappedToken } from '$lib/utils/onesec-swap.utils';
import { derived, type Readable } from 'svelte/store';

/**
 * The OneSec-bridged positions the user actually holds: a wrapped token carrying a non-zero
 * balance.
 *
 * Scoped to enabled tokens because that is exactly the set balances are loaded for — a token
 * the user has not enabled has no balance to compare against, so it could never qualify.
 *
 * Empty while OneSec swaps are off: with no swap available there is no action to point the
 * user at, and a warning telling them to swap back would be advice they cannot follow.
 */
export const oneSecBridgedTokensWithBalance: Readable<Token[]> = derived(
	[balancesStore, enabledFungibleTokens],
	([$balancesStore, $enabledFungibleTokens]) =>
		ONESEC_SWAP_ENABLED
			? $enabledFungibleTokens.filter(
					(token) =>
						isOneSecWrappedToken({ token, networkIds: ONESEC_EVM_NETWORK_IDS }) &&
						($balancesStore?.[token.id]?.data ?? ZERO) > ZERO
				)
			: []
);
