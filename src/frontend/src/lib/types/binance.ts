// Source: https://github.com/binance/binance-spot-api-docs/blob/master/rest-api.md#current-average-price
export interface BinanceAvgPrice {
	mins: number; // Average price interval (in minutes)
	price: string; // Average price
	closeTime?: number; // Last trade time
}
