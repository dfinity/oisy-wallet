import type { Token } from '$lib/types/token';

export type SwapSelectTokenType = 'source' | 'destination';

export type DisplayUnit = 'token' | 'usd';

export type SwapProvider = 'kongSwap' | 'icpSwap';

export interface ProviderFee {
	fee: bigint;
	token: Token;
}

export interface ICPSwapResult {
	receiveAmount: bigint;
}

export type Slippage = string | number;

export interface SwapMappedResult {
	provider: SwapProvider;
	receiveAmount: bigint;
	slippage?: number;
	route?: string[];
	liquidityFees?: ProviderFee[];
	receiveOutMinimum?: bigint;
	networkFee?: ProviderFee;
	swapDetails: unknown;
}
