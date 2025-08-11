import type { SwapAmountsReply } from '$declarations/kong_backend/kong_backend.did';
import type { IcToken } from '$icp/types/ic-token';
import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
import type { ProgressStepsSwap } from '$lib/enums/progress-steps';
import type { Token } from '$lib/types/token';
import type { Identity } from '@dfinity/agent';
import type { BridgePrice, DeltaPrice, OptimalRate } from '@velora-dex/sdk';
import type { OptionIdentity } from './identity';
import type { Amount, OptionAmount } from './send';

export type SwapSelectTokenType = 'source' | 'destination';

export type DisplayUnit = 'token' | 'usd';

export enum SwapProvider {
	ICP_SWAP = 'icpSwap',
	KONG_SWAP = 'kongSwap',
	VELORA = 'velora'
}

export enum VeloraSwapTypes {
	DELTA = 'delta',
	MARKET = 'market'
}

export enum SwapErrorCodes {
	WITHDRAW_FAILED = 'withdraw_failed',
	DEPOSIT_FAILED = 'deposit_error',
	SWAP_FAILED_WITHDRAW_SUCCESS = 'swap_failed_withdraw_success',
	SWAP_SUCCESS_WITHDRAW_FAILED = 'swap_success_withdraw_failed',
	SWAP_FAILED_2ND_WITHDRAW_SUCCESS = 'swap_failed_2nd_withdraw_success',
	SWAP_FAILED_WITHDRAW_FAILED = 'swap_failed_withdraw_failed',
	ICP_SWAP_WITHDRAW_SUCCESS = 'ICPSwap_withdraw_success',
	ICP_SWAP_WITHDRAW_FAILED = 'ICPSwap_withdraw_failed'
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
	isSourceTokenIcrc2: boolean;
}

export type Slippage = string | number;

export type SwapMappedResult =
	| {
			provider: SwapProvider.ICP_SWAP;
			receiveAmount: bigint;
			receiveOutMinimum: bigint;
			swapDetails: ICPSwapResult;
			type?: string;
	  }
	| {
			provider: SwapProvider.KONG_SWAP;
			receiveAmount: bigint;
			slippage: number;
			route: string[];
			liquidityFees: ProviderFee[];
			networkFee?: ProviderFee;
			swapDetails: SwapAmountsReply;
			type?: string;
	  }
	| {
			provider: SwapProvider.VELORA;
			receiveAmount: bigint;
			receiveOutMinimum?: bigint;
			swapDetails: VeloraSwapDetails;
			type: string;
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

export type SwapErrorKey = keyof I18n['swap']['error'];

export type SwapProviderConfig = KongSwapProvider | IcpSwapProvider;

export interface SwapParams {
	identity: OptionIdentity;
	progress: (step: ProgressStepsSwap) => void;
	sourceToken: IcTokenToggleable;
	destinationToken: IcTokenToggleable;
	swapAmount: Amount;
	receiveAmount: bigint;
	slippageValue: Amount;
	sourceTokenFee: bigint;
	isSourceTokenIcrc2: boolean;
	setFailedProgressStep?: (step: ProgressStepsSwap) => void;
	tryToWithdraw?: boolean;
	withdrawDestinationTokens?: boolean;
}

export interface IcpSwapWithdrawParams {
	identity: OptionIdentity;
	canisterId: string;
	tokenId: string;
	amount: bigint;
	fee: bigint;
	setFailedProgressStep?: (step: ProgressStepsSwap) => void;
}

export interface IcpSwapManualWithdrawParams extends IcpSwapWithdrawParams {
	withdrawDestinationTokens: boolean;
	token: IcTokenToggleable;
}

export interface IcpSwapWithdrawResponse {
	code: SwapErrorCodes;
	message?: string;
	variant?: 'error' | 'warning' | 'info';
	swapSucceded?: boolean;
}

export interface FormatSlippageParams {
	slippageValue: OptionAmount;
	receiveAmount: bigint;
	decimals: number;
}

export type VeloraSwapDetails = DeltaPrice & BridgePrice & OptimalRate;
