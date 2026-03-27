import type { StakeBalances } from '$lib/types/stake-balance';
import { derived, type Readable } from 'svelte/store';

// The store will be implemented as soon as we have new staking providers
export const stakeBalances: Readable<StakeBalances> = derived([], () => ({}));
