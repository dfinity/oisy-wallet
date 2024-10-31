import { balancesStore } from '$lib/stores/balances.store';
import { token } from '$lib/stores/token.store';
import type { OptionBalance } from '$lib/types/balance';
import { checkAnyNonZeroBalance } from '$lib/utils/balances.utils';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

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
		$balanceStore[$token.id]?.data.isZero() === true
);

export const anyBalanceNonZero: Readable<boolean> = derived([balancesStore], ([$balanceStore]) =>
	checkAnyNonZeroBalance($balanceStore)
);
