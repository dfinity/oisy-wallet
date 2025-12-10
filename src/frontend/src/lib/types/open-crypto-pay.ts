import type { EthAddress } from '$eth/types/address';
import type { EthFeeResult } from '$eth/types/pay';
import type { ProgressStepsPayment } from '$lib/enums/progress-steps';
import type { Network } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import type { Identity } from '@icp-sdk/core/agent';

export interface Address {
	street?: string;
	houseNumber?: string;
	city?: string;
	zip?: string;
	country?: string;
}

export interface Recipient {
	name?: string;
	address?: Address;
	phone?: string;
	mail?: string;
	website?: string;
	registrationNumber?: string;
	storeType?: string;
	merchantCategory?: string;
	goodsType?: string;
	goodsCategory?: string;
}

export interface Quote {
	id: string;
	expiration?: string;
	payment?: string;
}

export interface RequestedAmount {
	asset: string;
	amount: string;
}

export interface Asset {
	asset: string;
	amount: string;
}

export interface TransferAmount {
	method: string;
	minFee?: number;
	assets: Asset[];
	available: boolean;
}

export interface OpenCryptoPayResponse {
	id: string;
	tag: string;
	callback: string;
	minSendable: number;
	maxSendable: number;
	metadata: string;
	requestedAmount: RequestedAmount;
	transferAmounts: TransferAmount[];
	externalId?: string;
	mode?: string;
	displayName?: string;
	standard?: string;
	possibleStandards?: string[];
	displayQr?: boolean;
	recipient?: Recipient;
	route?: string;
	quote?: Quote;
}

export interface PaymentMethodData {
	assets: Map<string, { amount: string }>;
	minFee?: number;
}

export interface PayableToken extends Token {
	amount: string;
	tokenNetwork: string;
	minFee?: number;
}

export interface PayableTokenWithFees extends PayableToken {
	fee?: EthFeeResult;
}

export interface PrepareTokensParams {
	transferAmounts: TransferAmount[];
	networks: Network[];
	availableTokens: Token[];
}

export interface PayableTokenWithConvertedAmount extends PayableTokenWithFees {
	amountInUSD: number;
	feeInUSD: number;
	sumInUSD: number;
}

export interface ValidatedPaymentData {
	address: string;
	ethereumChainId: bigint;
	value: bigint;
	feeData: {
		maxFeePerGas: bigint;
		maxPriorityFeePerGas: bigint;
	};
	estimatedGasLimit: bigint;
}

export interface PayParams {
	token: PayableTokenWithConvertedAmount;
	data: OpenCryptoPayResponse;
	from: EthAddress;
	identity: Identity;
	quoteId: string;
	callback: string;
	progress: (step: ProgressStepsPayment) => void;
	amount: bigint;
}

export interface TransactionBaseParams {
	from: string;
	to: string;
	amount: bigint;
	maxPriorityFeePerGas: bigint;
	maxFeePerGas: bigint;
	nonce: number;
	gas: bigint;
	chainId: bigint;
}
