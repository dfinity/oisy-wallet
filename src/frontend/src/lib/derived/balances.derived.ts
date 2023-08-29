import { balancesStore } from '$lib/stores/balances.store';
import { tokensStore } from '$lib/stores/tokens.stores';
import { isNullish, nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const balanceEmpty: Readable<boolean> = derived(
	[balancesStore, tokensStore],
	([$balanceStore, $tokensStore]) =>
		isNullish($balanceStore) ||
		isNullish($balanceStore?.[$tokensStore]) ||
		$balanceStore[$tokensStore].isZero()
);
export const balanceZero: Readable<boolean> = derived(
	[balancesStore, tokensStore],
	([$balanceStore, $tokensStore]) =>
		nonNullish($balanceStore) &&
		nonNullish($balanceStore?.[$tokensStore]) &&
		$balanceStore[$tokensStore].isZero()
);
