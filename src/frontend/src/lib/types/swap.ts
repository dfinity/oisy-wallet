import type { SwapAmountsReply } from '$declarations/kong_backend/kong_backend.did';
import type { Token } from '$lib/types/token';

export type SwapSelectTokenType = 'source' | 'destination';

export type DisplayUnit = 'token' | 'usd';

export enum SwapProvider {
	ICP_SWAP = 'icpSwap',
	KONG_SWAP = 'kongSwap'
}
export interface ProviderFee {
	fee: bigint;
	token: Token;
}

export interface ICPSwapResult {
	receiveAmount: bigint;
}

export type Slippage = string | number;

export type SwapMappedResult =
	| {
			provider: SwapProvider.ICP_SWAP;
			receiveAmount: bigint;
			receiveOutMinimum: bigint;
			swapDetails: ICPSwapResult;
	  }
	| {
			provider: SwapProvider.KONG_SWAP;
			receiveAmount: bigint;
			slippage: number;
			route: string[];
			liquidityFees: ProviderFee[];
			networkFee?: ProviderFee;
			swapDetails: SwapAmountsReply;
	  };
