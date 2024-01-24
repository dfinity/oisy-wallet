import { tokenId } from '$lib/derived/token.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { nonNullish } from '@dfinity/utils';
import type { BigNumber } from '@ethersproject/bignumber';
import { derived, type Readable } from 'svelte/store';

export const balance: Readable<BigNumber | undefined | null> = derived(
	[balancesStore, tokenId],
	([$balanceStore, $tokenId]) => $balanceStore?.[$tokenId]?.data
);

export const balanceZero: Readable<boolean> = derived(
	[balancesStore, tokenId],
	([$balanceStore, $tokenId]) =>
		nonNullish($balanceStore) &&
		nonNullish($balanceStore?.[$tokenId]) &&
		$balanceStore[$tokenId]?.data.isZero() === true
);
