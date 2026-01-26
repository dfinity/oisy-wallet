import type { TokenId } from '$lib/types/token';

export type StakeBalances = Record<TokenId, { staked: bigint; claimable: bigint }>;
