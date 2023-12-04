// https://www.coingecko.com/api/documentation

// We only support ETH <> USD for now, therefore not an exhaustive list.
// *refers to curl -l https://api.coingecko.com/api/v3/coins/list
export type CoingeckoCoinsId = 'ethereum';

// We only support ETH <> USD for now, therefore not an exhaustive list.
// *refers to curl -l https://api.coingecko.com/api/v3/simple/supported_vs_currencies
export type CoingeckoCurrency = 'usd';

export interface CoingeckoSimplePriceParams {
	// id of coins, comma-separated if querying more than 1 coin (therefore an array join(","))
	ids: CoingeckoCoinsId | CoingeckoCoinsId[];

	// vs_currency of coins, comma-separated if querying more than 1 vs_currency
	vs_currencies: CoingeckoCurrency;

	// true/false to include market_cap, default: false
	include_market_cap?: boolean;

	// true/false to include 24hr_vol, default: false
	include_24hr_vol?: boolean;

	// true/false to include 24hr_change, default: false
	include_24hr_change?: boolean;

	// true/false to include last_updated_at of price, default: false
	include_last_updated_at?: boolean;

	// full or any value between 0 - 18 to specify decimal place for currency price value
	precision?: number;
}

export interface CoingeckoSimplePrice {
	usd: number;
	usd_market_cap?: number;
	usd_24h_vol?: number;
	usd_24h_change?: number;
	last_updated_at?: number;
}

export type CoingeckoSimplePriceResponse = Record<CoingeckoCoinsId, CoingeckoSimplePrice>;
