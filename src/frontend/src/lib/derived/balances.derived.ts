import { ZERO } from '$lib/constants/app.constants';
import { enabledFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { token } from '$lib/stores/token.store';
import type { OptionBalance } from '$lib/types/balance';
import { checkAllBalancesZero, checkAnyNonZeroBalance } from '$lib/utils/balances.utils';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

// TODO: Create tests for this store
export const balance: Readable<OptionBalance> = derived(
	[balancesStore, token],
	([$balanceStore, $token]) => (nonNullish($token) ? $balanceStore?.[$token.id]?.data : undefined)
);

// TODO: Create tests for this store
export const balanceZero: Readable<boolean> = derived(
	[balancesStore, token],
	([$balanceStore, $token]) =>
		nonNullish($balanceStore) &&
		nonNullish($token) &&
		nonNullish($balanceStore?.[$token.id]) &&
		$balanceStore[$token.id]?.data === ZERO
);

export const anyBalanceNonZero: Readable<boolean> = derived([balancesStore], ([$balanceStore]) =>
	checkAnyNonZeroBalance($balanceStore)
);

export const allBalancesZero: Readable<boolean> = derived(
	[balancesStore, enabledFungibleNetworkTokens],
	([$balancesStore, $enabledNetworkTokens]) =>
		checkAllBalancesZero({
			$balancesStore,
			minLength: $enabledNetworkTokens.length
		})
);

export const noPositiveBalanceAndNotAllBalancesZero: Readable<boolean> = derived(
	[anyBalanceNonZero, allBalancesZero],
	([$anyBalanceNonZero, $allBalancesZero]) => !$anyBalanceNonZero && !$allBalancesZero
);
