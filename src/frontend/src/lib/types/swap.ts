import type { SwapAmountsReply } from '$declarations/kong_backend/kong_backend.did';
import type { EthAddress, OptionEthAddress } from '$eth/types/address';
import type { ErcFungibleToken } from '$eth/types/erc-fungible';
import type { Erc20Token } from '$eth/types/erc20';
import type { EthereumNetwork } from '$eth/types/network';
import type { ProgressStep } from '$eth/types/send';
import type { IcToken } from '$icp/types/ic-token';
import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
import type { ProgressStepsSwap } from '$lib/enums/progress-steps';
import type { Address, OptionAddress } from '$lib/types/address';
import type { NearIntentsQuoteResponse } from '$lib/types/near-intents';
import type { Amount, OptionAmount } from '$lib/types/send';
import type { Token } from '$lib/types/token';
import type { RequiredTransactionFeeData } from '$lib/types/transaction';
import type { OptionSolAddress, SolAddress } from '$sol/types/address';
import type { Identity } from '@icp-sdk/core/agent';
import type {
	BridgePrice,
	DeltaPrice,
	OptimalRate,
	QuoteParams,
	SimpleFetchSDK
} from '@velora-dex/sdk';

export type SwapSelectTokenType = 'source' | 'destination';

export type DisplayUnit = 'token' | 'usd';

export type SwapTokenCategory = 'icp' | 'evm' | 'sol';

export type SwapCategorizedTokenIds = Partial<Record<SwapTokenCategory, Set<string>>>;

export type FindProviderSourceTokens = (params: {
	key: SwapProvider;
	category: SwapTokenCategory;
}) => Set<string> | undefined;

export interface SwapDestinationsContext {
	sourceToken: Token;
	supportedSourceTokens: Set<string> | undefined;
	findProviderSourceTokens: FindProviderSourceTokens;
}

export type GetSupportedDestinationsFn = (
	ctx: SwapDestinationsContext
) => SwapCategorizedTokenIds | undefined;

export enum SwapProvider {
	ICP_SWAP = 'icpSwap',
	KONG_SWAP = 'kongSwap',
	VELORA = 'velora',
	NEAR_INTENTS = 'nearIntents',
	ONE_SEC = 'oneSec'
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
	sourceToken: Token;
	destinationToken: Token;
	amount: string | number;
	tokens: Token[];
	slippage: string | number;
	isSourceTokenIcrc2?: boolean;
	userEthAddress: OptionEthAddress;
	userSolAddress: OptionSolAddress;
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
	  }
	| {
			provider: SwapProvider.NEAR_INTENTS;
			receiveAmount: bigint;
			receiveOutMinimum?: bigint;
			swapDetails: NearIntentsQuoteResponse;
			type?: string;
	  }
	| {
			provider: SwapProvider.ONE_SEC;
			receiveAmount: bigint;
			receiveOutMinimum?: bigint;
			swapDetails: OneSecSwapDetails;
			type?: string;
	  };

interface KongQuoteParams {
	swap: SwapAmountsReply;
	tokens: Token[];
}

interface IcpQuoteParams {
	swap: ICPSwapResult;
	slippage: Slippage;
	destToken: IcToken;
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
	getSupportedTokens?: (params: { identity: Identity }) => Promise<Set<string>>;
	getSupportedDestinations: GetSupportedDestinationsFn;
}

type KongSwapProvider = BaseSwapProvider<SwapProvider.KONG_SWAP, SwapAmountsReply, KongQuoteParams>;

type IcpSwapProvider = BaseSwapProvider<SwapProvider.ICP_SWAP, ICPSwapResult, IcpQuoteParams>;

export type SwapProviderConfig = KongSwapProvider | IcpSwapProvider;

export interface EvmSwapProviderConfig {
	key: SwapProvider;
	getQuote: (params: EvmQuoteParams) => Promise<SwapMappedResult | undefined>;
	isEnabled: boolean;
	getSupportedTokens?: () => Promise<Set<string>>;
	getSupportedDestinations: GetSupportedDestinationsFn;
}

export interface SolSwapProviderConfig {
	key: SwapProvider;
	getQuote: (params: NearIntentsQuoteParams) => Promise<SwapMappedResult | undefined>;
	isEnabled: boolean;
	getSupportedTokens?: () => Promise<Set<string>>;
	getSupportedDestinations: GetSupportedDestinationsFn;
}

export interface SwapParams {
	identity: Identity;
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
	identity: Identity;
	canisterId: string;
	tokenId: string;
	amount: bigint;
	fee: bigint;
	sourceToken: IcTokenToggleable;
	destinationToken: IcTokenToggleable;
	setFailedProgressStep?: (step: ProgressStepsSwap) => void;
}

export interface IcpSwapManualWithdrawParams {
	identity: Identity;
	withdrawDestinationTokens: boolean;
	canisterId: string;
	sourceToken: IcTokenToggleable;
	destinationToken: IcTokenToggleable;
	setFailedProgressStep?: (step: ProgressStepsSwap) => void;
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

export interface GetQuoteParams extends QuoteParams<'all' | 'market'> {
	destChainId?: number;
}

export interface EvmQuoteParams {
	sourceToken: Erc20Token;
	destinationToken: Erc20Token | IcToken;
	amount: bigint;
	userAddress: OptionEthAddress;
	slippage: Slippage;
}

export interface NearIntentsQuoteParams {
	sourceToken: Token;
	destinationToken: Token;
	amount: bigint;
	userAddress: OptionAddress<Address>;
	recipientAddress?: string;
	slippage: Slippage;
}

export interface GetWithdrawableTokenParams {
	tokenAddress: string;
	sourceToken: IcTokenToggleable;
	destinationToken: IcTokenToggleable;
}

export interface OneSecSwapDetails {
	transferFeeInUnits: bigint;
	protocolFeeInPercent: number;
}

export interface OneSecIcpToEvmParams {
	identity: Identity;
	progress: (step: ProgressStepsSwap) => void;
	sourceToken: IcToken;
	destinationToken: Erc20Token;
	swapAmount: Amount;
	userEthAddress: EthAddress;
	setFailedProgressStep?: (step: ProgressStepsSwap) => void;
	/**
	 * FE-generated UUID. The swap lifecycle is mirrored to the backend's
	 * active-user-transactions store so the FE can resume polling across
	 * logout / tab close. Terminal-state side-effects (wallet refresh,
	 * telemetry) are wired off the AUT store, not via callbacks — they fire
	 * whether the swap settles in this session or after a refresh via the
	 * poller.
	 */
	swapId: string;
}

export interface OneSecEvmToIcpParams extends RequiredTransactionFeeData {
	identity: Identity;
	progress: (step: ProgressStepsSwap) => void;
	sourceToken: Erc20Token;
	destinationToken: IcToken;
	swapAmount: Amount;
	userEthAddress: EthAddress;
	setFailedProgressStep?: (step: ProgressStepsSwap) => void;
	/**
	 * FE-generated UUID. See {@link OneSecIcpToEvmParams.swapId}.
	 */
	swapId: string;
}

export interface IcpBridgeQuoteParams {
	sourceToken: Token;
	destinationToken: Token;
	amount: bigint;
	userEthAddress: OptionEthAddress;
	slippage: Slippage;
}

export interface IcpBridgeSwapProviderConfig {
	key: SwapProvider;
	getQuote: (params: IcpBridgeQuoteParams) => Promise<SwapMappedResult | undefined>;
	isEnabled: boolean;
	getSupportedTokens?: () => Promise<Set<string>>;
	getSupportedDestinations: GetSupportedDestinationsFn;
}

export interface SwapProvidersConfig {
	name: string;
	logo: string;
	website: string;
}

export interface SwapVeloraParams extends RequiredTransactionFeeData {
	identity: Identity;
	progress: (step: ProgressStep) => void;
	sourceToken: ErcFungibleToken;
	destinationToken: ErcFungibleToken;
	swapAmount: Amount;
	receiveAmount: bigint;
	slippageValue: Amount;
	sourceNetwork: EthereumNetwork;
	destinationNetwork: EthereumNetwork;
	userAddress: EthAddress;
	swapDetails: VeloraSwapDetails;
	isGasless: boolean;
}

interface SwapNearIntentsParams {
	identity: Identity;
	progress: (step: ProgressStep) => void;
	sourceToken: Token;
	swapAmount: Amount;
	swapDetails: NearIntentsQuoteResponse;
}

export interface SwapNearIntentsEvmParams
	extends SwapNearIntentsParams, RequiredTransactionFeeData {
	sourceToken: ErcFungibleToken;
	destinationToken: ErcFungibleToken;
	receiveAmount: bigint;
	slippageValue: Amount;
	sourceNetwork: EthereumNetwork;
	userAddress: EthAddress;
}

export interface SwapNearIntentsSolParams extends SwapNearIntentsParams {
	destinationToken: Token;
	userAddress: SolAddress;
}

export interface CheckDeltaOrderStatusParams {
	sdk: SimpleFetchSDK;
	auctionId: string;
	onExecuted?: () => void;
	timeoutMs?: number;
	intervalMs?: number;
}

export interface DeltaSwapResponse {
	delta: DeltaPrice | BridgePrice;
	deltaAddress: string;
}
