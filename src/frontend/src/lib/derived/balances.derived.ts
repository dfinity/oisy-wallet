import { token } from '$lib/stores/token.store';
import { nonNullish } from '@dfinity/utils';
import type { BigNumber } from '@ethersproject/bignumber';
import { derived, type Readable } from 'svelte/store';

export const balance: Readable<BigNumber | undefined | null> = derived([token], ([$token]) =>
	nonNullish($token) ? $token.balance : undefined
);

export const balanceZero: Readable<boolean> = derived(
	[token],
	([$token]) => nonNullish($token) && nonNullish($token.balance) && $token.balance.isZero()
);
