import type { SwapAmountsReply } from '$declarations/kong_backend/kong_backend.did';
import type { IcToken } from '$icp/types/ic-token';
import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
import type { ProgressStepsSwap } from '$lib/enums/progress-steps';
import type { Token } from '$lib/types/token';
import type { Identity } from '@dfinity/agent';
import type { OptionIdentity } from './identity';
import type { Amount } from './send';

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

export interface FetchSwapAmountsParams {
	identity: Identity;
	sourceToken: IcToken;
	destinationToken: IcToken;
	amount: string | number;
	tokens: Token[];
	slippage: string | number;
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

export interface KongQuoteResult {
	swap: SwapAmountsReply;
	tokens: IcToken[];
}

export interface IcpQuoteResult {
	swap: ICPSwapResult;
	slippage: Slippage;
}

interface KongQuoteParams {
	swap: SwapAmountsReply;
	tokens: Token[];
}

interface IcpQuoteParams {
	swap: ICPSwapResult;
	slippage: Slippage;
}

interface SwapQuoteParams {
	identity: Identity;
	sourceToken: IcToken;
	destinationToken: IcToken;
	sourceAmount: bigint;
}
interface BaseSwapProvider<T extends SwapProvider, QuoteResult, QuoteMapParams> {
	key: T;
	getQuote: (params: SwapQuoteParams) => Promise<QuoteResult>;
	mapQuoteResult: (params: QuoteMapParams) => SwapMappedResult;
	isEnabled: boolean;
}

type KongSwapProvider = BaseSwapProvider<SwapProvider.KONG_SWAP, SwapAmountsReply, KongQuoteParams>;

type IcpSwapProvider = BaseSwapProvider<SwapProvider.ICP_SWAP, ICPSwapResult, IcpQuoteParams>;

export type SwapProviderConfig = KongSwapProvider | IcpSwapProvider;

export type SwapParams = {
	identity: OptionIdentity;
	progress: (step: ProgressStepsSwap) => void;
	sourceToken: IcTokenToggleable;
	destinationToken: IcTokenToggleable;
	swapAmount: Amount;
	receiveAmount: bigint;
	slippageValue: Amount;
	sourceTokenFee: bigint;
	isSourceTokenIcrc2: boolean;
};
