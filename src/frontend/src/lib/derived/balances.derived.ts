import { ZERO } from '$lib/constants/app.constants';
import { enabledFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { token } from '$lib/stores/token.store';
import type { OptionBalance } from '$lib/types/balance';
import { checkAllBalancesZero, checkAnyNonZeroBalance } from '$lib/utils/balances.utils';
import { derivedMemo } from '$lib/utils/derived-memo.utils';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

const booleanEqual = (a: boolean, b: boolean): boolean => a === b;

export const balance: Readable<OptionBalance> = derived(
	[balancesStore, token],
	([$balanceStore, $token]) => (nonNullish($token) ? $balanceStore?.[$token.id]?.data : undefined)
);

export const balanceZero: Readable<boolean> = derived(
	[balancesStore, token],
	([$balanceStore, $token]) =>
		nonNullish($balanceStore) &&
		nonNullish($token) &&
		nonNullish($balanceStore?.[$token.id]) &&
		$balanceStore[$token.id]?.data === ZERO
);

export const anyBalanceNonZero: Readable<boolean> = derivedMemo(
	[balancesStore],
	([$balanceStore]) => checkAnyNonZeroBalance($balanceStore),
	booleanEqual
);

export const allBalancesZero: Readable<boolean> = derivedMemo(
	[balancesStore, enabledFungibleNetworkTokens],
	([$balancesStore, $enabledNetworkTokens]) =>
		checkAllBalancesZero({
			$balancesStore,
			minLength: $enabledNetworkTokens.length
		}),
	booleanEqual
);

export const noPositiveBalanceAndNotAllBalancesZero: Readable<boolean> = derived(
	[anyBalanceNonZero, allBalancesZero],
	([$anyBalanceNonZero, $allBalancesZero]) => !$anyBalanceNonZero && !$allBalancesZero
);
