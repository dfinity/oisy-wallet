import type { TokenId } from '$lib/types/token';

export interface Options {
	timeout?: number;
	autoRetry?: boolean;
}

export interface HttpResponse<T> {
	data: T;
	statusCode: number;
	headers: { [x: string]: string | string[] };
}

export interface PingResponse {
	gecko_says: string;
}

export interface SimplePriceResponse {
	[coin: string]: {
		/**
		 * price of coin for this currency
		 */
		[currency: string]: number;
	};
}

export interface TokenPriceCurrencyResponse {
	/**
	 * ETH contract address same with the input pair
	 */
	[contract_address: string]: {
		/**
		 * price of coin for this currency
		 */
		[currency: string]: number;
	};
}

export interface TokenPriceResponse {
	/**
	 * ETH contract address => price of coin independent of currency
	 */
	[contract_address: TokenId]: number;
}
