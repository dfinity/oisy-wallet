import type { Token } from '$lib/types/token';

export type SwapSelectTokenType = 'source' | 'destination';

export type DisplayUnit = 'token' | 'usd';

export interface ProviderFee {
	fee: bigint;
	token: Token;
}
