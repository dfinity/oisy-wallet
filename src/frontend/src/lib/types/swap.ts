import type { SwapAmountsReply } from '$declarations/kong_backend/kong_backend.did';
import type { Erc20Token } from '$eth/types/erc20';
import type { EthereumNetwork } from '$eth/types/network';
import type { ProgressStep } from '$eth/types/send';
import type { IcToken } from '$icp/types/ic-token';
import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
import type { ProgressStepsSwap } from '$lib/enums/progress-steps';
import type { Token } from '$lib/types/token';
import type { Identity } from '@dfinity/agent';
import type {
	BridgePrice,
	DeltaPrice,
	OptimalRate,
	QuoteParams,
	SimpleFetchSDK
} from '@velora-dex/sdk';
import type { EthAddress, OptionEthAddress } from './address';
import type { OptionIdentity } from './identity';
import type { Amount, OptionAmount } from './send';
import type { RequiredTransactionFeeData } from './transaction';

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
export interface ProviderFee {
	fee: bigint;
	token: Token;
}

export interface ICPSwapResult {
	receiveAmount: bigint;
}

export interface VeloraDeltaQuoteResult {}

export interface FetchSwapAmountsParams {
	identity: Identity;
	sourceToken: Token & { address?: string };
	destinationToken: Token & { address?: string };
	amount: string | number | bigint;
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
}

export interface FormatSlippageParams {
	slippageValue: OptionAmount;
	receiveAmount: bigint;
	decimals: number;
}

export interface GetQuoteParams extends QuoteParams<'all'> {
	destChainId?: number;
}

export interface CheckDeltaOrderStatusParams {
	sdk: SimpleFetchSDK;
	auctionId: string;
	onExecuted?: () => void;
	timeoutMs?: number;
	intervalMs?: number;
}

export type VeloraSwapDetails = DeltaPrice & BridgePrice & OptimalRate;

export interface SwapVeloraParams extends RequiredTransactionFeeData {
	identity: OptionIdentity;
	progress: (step: ProgressStep) => void;
	sourceToken: Erc20Token;
	destinationToken: Erc20Token;
	swapAmount: Amount;
	receiveAmount: bigint;
	slippageValue: Amount;
	sourceNetwork: EthereumNetwork;
	destinationNetwork: EthereumNetwork;
	userAddress: EthAddress;
	swapDetails: VeloraSwapDetails;
}

export interface VeloraQuoteParams {
	sourceToken: Erc20Token;
	destinationToken: Erc20Token;
	amount: string;
	userAddress: OptionEthAddress;
}
