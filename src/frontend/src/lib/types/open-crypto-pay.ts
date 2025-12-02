import type { Network } from '$lib/types/network';
import type { Token } from '$lib/types/token';

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

export interface PrepareTokensParams {
	transferAmounts: TransferAmount[];
	networks: Network[];
	availableTokens: Token[];
}
