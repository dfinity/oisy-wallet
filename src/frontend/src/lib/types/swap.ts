import type { BtcAddress, OptionBtcAddress } from '$btc/types/address';
import type { UtxosFee } from '$btc/types/btc-send';
import type { SwapAmountsReply } from '$declarations/kong_backend/kong_backend.did';
import type { EthAddress, OptionEthAddress } from '$eth/types/address';
import type { ErcFungibleToken } from '$eth/types/erc-fungible';
import type { Erc20Token } from '$eth/types/erc20';
import type { EthereumNetwork } from '$eth/types/network';
import type { ProgressStep } from '$eth/types/send';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { IcToken } from '$icp/types/ic-token';
import type { IcTokenToggleable } from '$icp/types/ic-token-toggleable';
import type { ProgressStepsSwap } from '$lib/enums/progress-steps';
import type { Address, OptionAddress } from '$lib/types/address';
import type { NearIntentsQuoteResponse } from '$lib/types/near-intents';
import type { OisyTradeQuote, OisyTradeSwapDetails } from '$lib/types/oisy-trade-swap';
import type { Amount, OptionAmount } from '$lib/types/send';
import type { Token } from '$lib/types/token';
import type { RequiredTransactionFeeData } from '$lib/types/transaction';
import type { OptionSolAddress, SolAddress } from '$sol/types/address';
import type { BitcoinNetwork } from '@icp-sdk/canisters/ckbtc';
import type { Identity } from '@icp-sdk/core/agent';
import type { DeltaPrice, OptimalRate, QuoteParams } from '@velora-dex/sdk';

export type SwapSelectTokenType = 'source' | 'destination';

export type DisplayUnit = 'token' | 'usd';

export type SwapTokenCategory = 'icp' | 'evm' | 'sol' | 'btc';

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
	ONE_SEC = 'oneSec',
	CHAIN_FUSION = 'chainFusion',
	OISY_TRADE = 'oisyTrade'
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
	ICP_SWAP_WITHDRAW_FAILED = 'ICPSwap_withdraw_failed',
	NEAR_INTENTS_QUOTE_UNVERIFIED = 'near_intents_quote_unverified',
	NEAR_INTENTS_QUOTE_EXPIRED = 'near_intents_quote_expired'
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
	// The user's own Bitcoin address. Unlike the other two it is needed to *quote*, not
	// only to execute: a BTC → ckBTC offer's fee comes from selecting the user's UTXOs.
	userBtcAddress: OptionBtcAddress;
}

export type Slippage = string | number;

/**
 * The reason no offer could be quoted, when a provider named one.
 *
 * `minAmount` is the provider's minimum, in the source token's smallest unit,
 * when the provider communicated it.
 */
export interface SwapQuoteError {
	type: 'amount-too-low';
	minAmount?: bigint;
}

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
			swapDetails: DeltaPrice;
			type: VeloraSwapTypes.DELTA;
	  }
	| {
			provider: SwapProvider.VELORA;
			receiveAmount: bigint;
			receiveOutMinimum?: bigint;
			swapDetails: OptimalRate;
			type: VeloraSwapTypes.MARKET;
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
	  }
	| {
			provider: SwapProvider.CHAIN_FUSION;
			receiveAmount: bigint;
			swapDetails: ChainFusionSwapDetails;
			type?: string;
	  }
	| {
			provider: SwapProvider.OISY_TRADE;
			receiveAmount: bigint;
			// No `receiveOutMinimum`: a fill-or-kill order has no slippage semantics —
			// it fills at the submitted price or is killed — so the slippage control
			// must not affect this offer.
			swapDetails: OisyTradeSwapDetails;
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

// `getQuote` may resolve to `undefined` — an unorderable amount or an unpaired
// token is a non-offer, not an error — so `fetchSwapAmountsICP` maps only when a
// quote actually came back.
type OisyTradeSwapProvider = BaseSwapProvider<
	SwapProvider.OISY_TRADE,
	OisyTradeQuote | undefined,
	{ quote: OisyTradeQuote }
>;

export type SwapProviderConfig = KongSwapProvider | IcpSwapProvider | OisyTradeSwapProvider;

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

/**
 * Quote payload of either Velora execution mode. The two shapes are mutually exclusive —
 * `DeltaPrice.partner` is an object while `OptimalRate.partner` is a string — so this is a
 * union discriminated by `VeloraSwapTypes`, never an intersection.
 */
export type VeloraSwapDetails = DeltaPrice | OptimalRate;

export interface GetQuoteParams extends QuoteParams<'all' | 'market'> {
	destChainId?: number;
}

export interface EvmQuoteParams {
	sourceToken: Erc20Token;
	destinationToken: Erc20Token | IcToken;
	amount: bigint;
	userAddress: OptionEthAddress;
	// The user's address on the destination chain, for cross-chain providers that pay out
	// there. Absent, such providers fall back to `userAddress`.
	recipientAddress?: string;
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

export type ChainFusionFee = ProviderFee & {
	labelPath: string;
	/**
	 * Whether the fee comes out of the converted amount, reducing what the user receives.
	 *
	 * It decides the receive amount and nothing else: every fee is disclosed either way, in
	 * the form's fee section, because the total shown there has to be the user's whole cost of
	 * the conversion. The provider sheet carries no fees.
	 *
	 * The test is what the minter actually takes out of the amount it credits or pays out,
	 * which is not the same as what the Convert flow displays — a real BTC → ckBTC
	 * conversion showed Convert quoting 1:1 while the minter withheld its KYT fee. So:
	 * - **Flagged:** the ckBTC KYT fee on a BTC → ckBTC deposit, and the Bitcoin network +
	 *   minter fee on a ckBTC → BTC withdrawal (`IcTokenFees`'s `totalDestinationTokenFee`).
	 * - **Not flagged:** a ck ledger fee, because `approve(amount)` debits `amount + fee`
	 *   while the minter moves the full `amount`.
	 * - **Not flagged:** the BTC network fee of a deposit — UTXO selection covers it out of
	 *   the transaction's change, not out of the deposited amount.
	 * - **Not flagged:** the Ethereum gas of a ckETH withdrawal, although the minter does
	 *   deduct it. The estimate is a doubled, mostly-reimbursed ceiling, so quoting it as a
	 *   deduction would under-report what lands by more than it over-reports.
	 */
	deductedFromAmount?: boolean;
};

export interface ChainFusionSwapDetails {
	// Charged in the source token, in source-token units. Whether an entry also comes out
	// of the converted amount is `deductedFromAmount`'s job, not this list's — a ck ledger
	// fee belongs here yet is paid on top of the amount.
	sourceFees: ChainFusionFee[];
	// Charged in a third token the user must hold (ckETH for ckERC20 → ERC20; native
	// ETH gas is already handled by the EVM wizard's fee context).
	externalFees: ChainFusionFee[];
	// Minter-enforced floor, in source-token units, when the direction has one.
	minimumAmount?: bigint;
	// Whether the minter info the quote read was certified, set only by the directions
	// that consult it (ckETH → ETH). Mirrors Convert's `minter-info-not-certified` gate:
	// an uncertified read blocks Review until the certified update lands.
	minterInfoCertified?: boolean;
}

/**
 * One ck conversion pair: a ck ledger and the native token it is backed by.
 *
 * Resolved from the curated ck token environment rather than from a runtime token
 * list, because a provider's `getSupportedTokens` is invoked with no arguments and
 * `getSupportedDestinations` only ever sees the source token. The 1Sec analogue is
 * `DEFAULT_CONFIG.tokens`.
 */
export interface ChainFusionPair {
	ckLedgerCanisterId: LedgerCanisterIdText;
	twinToken: Token;
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

export interface BtcQuoteParams {
	sourceToken: Token;
	destinationToken: Token;
	amount: bigint;
	// The user's own Bitcoin address, the source of the UTXOs a deposit spends.
	userBtcAddress: BtcAddress;
	// The user's address on the destination chain. Chain Fusion ignores it (a BTC → ckBTC
	// deposit credits the user's own principal); cross-chain providers pay out to it.
	recipientAddress?: string;
	slippage: Slippage;
}

export interface BtcSwapProviderConfig {
	key: SwapProvider;
	getQuote: (params: BtcQuoteParams) => Promise<SwapMappedResult | undefined>;
	isEnabled: boolean;
	getSupportedTokens?: () => Promise<Set<string>>;
	getSupportedDestinations: GetSupportedDestinationsFn;
}

export interface SwapProvidersConfig {
	name: string;
	logo: string;
	website: string;
}

interface SwapVeloraParams extends RequiredTransactionFeeData {
	identity: Identity;
	progress: (step: ProgressStep) => void;
	sourceToken: ErcFungibleToken;
	destinationToken: ErcFungibleToken;
	swapAmount: Amount;
	receiveAmount: bigint;
	slippageValue: Amount;
	sourceNetwork: EthereumNetwork;
	userAddress: EthAddress;
	isGasless: boolean;
}

export interface SwapVeloraDeltaParams extends SwapVeloraParams {
	swapDetails: DeltaPrice;
}

export interface SwapVeloraMarketParams extends SwapVeloraParams {
	swapDetails: OptimalRate;
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

export interface SwapNearIntentsBtcParams extends SwapNearIntentsParams {
	destinationToken: Token;
	// The user's own Bitcoin address, the source of the UTXOs the deposit spends.
	userAddress: BtcAddress;
	network: BitcoinNetwork;
	utxosFee: UtxosFee;
}

export interface DeltaSwapResponse {
	delta: DeltaPrice;
}
