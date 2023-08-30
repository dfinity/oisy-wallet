import { balancesStore } from '$lib/stores/balances.store';
import { tokenIdStore } from '$lib/stores/token-id.stores';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { BigNumber } from '@ethersproject/bignumber';
import { derived, type Readable } from 'svelte/store';

export const balance: Readable<BigNumber | undefined | null> = derived(
	[balancesStore, tokenIdStore],
	([$balanceStore, $tokenIdStore]) => $balanceStore?.[$tokenIdStore]
);

export const balanceEmpty: Readable<boolean> = derived(
	[balancesStore, tokenIdStore],
	([$balanceStore, $tokenIdStore]) =>
		isNullish($balanceStore) ||
		isNullish($balanceStore?.[$tokenIdStore]) ||
		$balanceStore[$tokenIdStore].isZero()
);

export const balanceZero: Readable<boolean> = derived(
	[balancesStore, tokenIdStore],
	([$balanceStore, $tokenIdStore]) =>
		nonNullish($balanceStore) &&
		nonNullish($balanceStore?.[$tokenIdStore]) &&
		$balanceStore[$tokenIdStore].isZero()
);
