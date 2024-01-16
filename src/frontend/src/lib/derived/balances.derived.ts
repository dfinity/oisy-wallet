import { tokenId } from '$lib/derived/token.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { BigNumber } from '@ethersproject/bignumber';
import { derived, type Readable } from 'svelte/store';

export const balance: Readable<BigNumber | undefined | null> = derived(
	[balancesStore, tokenId],
	([$balanceStore, $tokenId]) => $balanceStore?.[$tokenId].data
);

export const balanceEmpty: Readable<boolean> = derived(
	[balancesStore, tokenId],
	([$balanceStore, $tokenId]) =>
		isNullish($balanceStore) ||
		isNullish($balanceStore?.[$tokenId]) ||
		$balanceStore[$tokenId].data.isZero()
);

export const balanceZero: Readable<boolean> = derived(
	[balancesStore, tokenId],
	([$balanceStore, $tokenId]) =>
		nonNullish($balanceStore) &&
		nonNullish($balanceStore?.[$tokenId]) &&
		$balanceStore[$tokenId].data.isZero()
);
