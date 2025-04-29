import type { SwapAmountsReply } from '$declarations/kong_backend/kong_backend.did';
import type { IcToken } from '$icp/types/ic-token';
import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
import type { ProgressStepsSwap } from '$lib/enums/progress-steps';
import type { SwapProviderResult } from '$lib/stores/swap-amounts.store';
import type { Token } from '$lib/types/token';
import type { Identity } from '@dfinity/agent';
import type { Amount, OptionAmount } from './send';

export type SwapSelectTokenType = 'source' | 'destination';

export type DisplayUnit = 'token' | 'usd';

export interface ProviderFee {
	fee: bigint;
	token: Token;
}

export type SupportedSwapRaw = SwapAmountsReply | ICPSwapRawResult;

export type test = { swap: SwapAmountsReply | ICPSwapRawResult; tokens?: Token[] };

export interface SwapProvider<TSwapRaw> {
	id: string;
	getQuote: (params: SwapQuoteParams) => Promise<TSwapRaw>;
	mapQuoteResult: (params: TSwapRaw) => SwapProviderResult;
}
export interface SwapQuoteParams {
	identity: Identity;
	sourceToken: IcToken;
	destinationToken: IcToken;
	sourceAmount: bigint;
}

export interface FetchSwapOptionsParams {
	identity: Identity;
	sourceToken: IcToken;
	destinationToken: IcToken;
	amount: number;
	tokens: Token[];
	slippage: OptionAmount
}

export interface MapSwapQuoteParams<TSwapRaw> {
	swap: TSwapRaw;
	tokens?: Token[];
}

export interface ICPSwapRawResult {
	receiveAmount: bigint;
	slippage: OptionAmount;
};
export interface SwapWithIcpSwapParams {
	identity: Identity;
	progress: (step: ProgressStepsSwap) => void;
	sourceToken: IcTokenToggleable;
	destinationToken: IcTokenToggleable;
	swapAmount: Amount;
	receiveAmount: bigint;
	slippageValue: Amount;
	sourceTokenFee: bigint;
	isSourceTokenIcrc2: boolean;
	fee?: bigint;
}
