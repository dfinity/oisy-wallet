import { getBalances, getTradingPairs, listSupportedTokens } from '$lib/api/oisy-trade.api';
import { i18n } from '$lib/stores/i18n.store';
import { oisyTradeStore } from '$lib/stores/oisy-trade.store';
import type { NullishIdentity } from '$lib/types/identity';
import { consoleError } from '$lib/utils/console.utils';
import { isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

// Best-effort load of trading pairs, supported tokens and the caller's DEX
// balances into `oisyTradeStore`; errors are logged so a transient canister
// failure never breaks the Trading tab. Read-only.
export const loadOisyTrade = async ({ identity }: { identity: NullishIdentity }): Promise<void> => {
	if (isNullish(identity)) {
		oisyTradeStore.reset();
		return;
	}

	const nullishIdentityErrorMessage = get(i18n).auth.error.no_internet_identity;

	try {
		const [pairs, supportedTokens, balances] = await Promise.all([
			getTradingPairs({ identity, nullishIdentityErrorMessage }),
			listSupportedTokens({ identity, nullishIdentityErrorMessage }),
			getBalances({ identity, nullishIdentityErrorMessage })
		]);

		oisyTradeStore.set({ pairs, supportedTokens, balances });
	} catch (err: unknown) {
		consoleError(err);
	}
};
