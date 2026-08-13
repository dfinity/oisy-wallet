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
	slippageTolerance: number;
	originAsset: string;
	depositType: NearIntentsDepositType;
	destinationAsset: string;
	amount: string;
	recipient: string;
	recipientType: NearIntentsRecipientType;
	refundTo: string;
	refundType: NearIntentsDepositType;
	deadline: string;
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

export const NEAR_INTENTS_EXTERNAL_REF_KEYS = {
	// Poll keys — the durable, resumable identifiers `GET /status` is keyed by.
	// Known at quote time, snapshotted at AUT creation so the global poller can
	// re-derive the swap's state across refresh / logout.
	DEPOSIT_ADDRESS: 'near_intents_deposit_address',
	DEPOSIT_MEMO: 'near_intents_deposit_memo',
	// Optional debug/traceability, learned mid-flow from `/status` swapDetails.
	ORIGIN_TX_HASH: 'near_intents_origin_tx_hash',
	DESTINATION_TX_HASH: 'near_intents_destination_tx_hash',
	// Display + analytics metadata snapshotted at creation time. Reuses the same
	// key names as OneSec (`$lib/types/onesec-swap`) so the AUT row rendering and
	// analytics paths are shared rather than duplicated. Stay correct across page
	// refresh / cross-session resume — even when the user has since disabled the
	// underlying token.
	AMOUNT: 'amount',
	SOURCE_TOKEN_SYMBOL: 'source_token_symbol',
	SOURCE_NETWORK_SYMBOL: 'source_network_symbol',
	DESTINATION_TOKEN_SYMBOL: 'destination_token_symbol',
	DESTINATION_NETWORK_SYMBOL: 'destination_network_symbol'
} as const;

export type NearIntentsExternalRefKey =
	(typeof NEAR_INTENTS_EXTERNAL_REF_KEYS)[keyof typeof NEAR_INTENTS_EXTERNAL_REF_KEYS];

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
