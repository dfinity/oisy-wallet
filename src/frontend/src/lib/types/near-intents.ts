export interface NearIntentsToken {
	assetId: string;
	decimals: number;
	blockchain: string;
	symbol: string;
	price: number;
	priceUpdatedAt: string;
	contractAddress: string | null;
}

export type NearIntentsSwapType = 'EXACT_INPUT' | 'EXACT_OUTPUT' | 'FLEX_INPUT' | 'ANY_INPUT';

export type NearIntentsDepositType = 'ORIGIN_CHAIN' | 'INTENTS';

export type NearIntentsRecipientType = 'DESTINATION_CHAIN' | 'INTENTS';

export interface NearIntentsQuoteRequest {
	dry: boolean;
	swapType: NearIntentsSwapType;
	slippageTolerance?: number;
	originAsset: string;
	depositType?: NearIntentsDepositType;
	destinationAsset: string;
	amount: string;
	recipient: string;
	recipientType?: NearIntentsRecipientType;
	refundTo: string;
	refundType?: NearIntentsDepositType;
	deadline?: string;
	quoteWaitingTimeMs?: number;
	referral?: string;
}

export interface NearIntentsQuote {
	depositAddress: string;
	depositMemo: string | null;
	amountIn: string;
	amountInFormatted: string;
	amountInUsd: string;
	minAmountIn?: string;
	maxAmountIn?: string;
	amountOut: string;
	amountOutFormatted: string;
	amountOutUsd: string;
	minAmountOut?: string;
	deadline: string;
	timeWhenInactive?: string;
	timeEstimate: number;
	refundFee?: string;
}

export interface NearIntentsQuoteResponse {
	correlationId: string;
	timestamp: string;
	signature: string;
	quoteRequest: NearIntentsQuoteRequest;
	quote: NearIntentsQuote;
}

export type NearIntentsSwapStatus =
	| 'PENDING_DEPOSIT'
	| 'KNOWN_DEPOSIT_TX'
	| 'INCOMPLETE_DEPOSIT'
	| 'PROCESSING'
	| 'SUCCESS'
	| 'REFUNDED'
	| 'FAILED';

export const NEAR_INTENTS_TERMINAL_STATUSES: NearIntentsSwapStatus[] = [
	'SUCCESS',
	'FAILED',
	'REFUNDED',
	'INCOMPLETE_DEPOSIT'
];

export interface NearIntentsTxHash {
	hash: string;
	explorerUrl: string;
}

export interface NearIntentsSwapDetails {
	amountIn?: string;
	amountInFormatted?: string;
	amountOut?: string;
	amountOutFormatted?: string;
	slippage?: number;
	originChainTxHashes?: NearIntentsTxHash[];
	destinationChainTxHashes?: NearIntentsTxHash[];
	refundedAmount?: string;
	refundReason?: string;
	depositedAmount?: string;
}

export interface NearIntentsStatusResponse {
	correlationId: string;
	status: NearIntentsSwapStatus;
	updatedAt: string;
	quoteResponse: NearIntentsQuoteResponse;
	swapDetails: NearIntentsSwapDetails;
}

export interface NearIntentsDepositSubmitRequest {
	txHash: string;
	depositAddress: string;
	nearSenderAccount?: string;
	memo?: string;
}
