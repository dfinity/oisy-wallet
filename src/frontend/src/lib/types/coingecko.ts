// https://www.coingecko.com/api/documentation

// For ethereum (non ERC20), we are only interested in ETH <> USD for now, therefore not an exhaustive list.
// *refers to curl -l https://api.coingecko.com/api/v3/coins/list
export type CoingeckoCoinsId = 'ethereum';

// We are interested in the ERC20 <> USD on Ethereum only, therefore not an exhaustive list.
// *refers to curl -l https://api.coingecko.com/api/v3/asset_platforms
export type CoingeckoPlatformId = 'ethereum';

// We only support conversion in USD for now, therefore not an exhaustive list.
// *refers to curl -l https://api.coingecko.com/api/v3/simple/supported_vs_currencies
export type CoingeckoCurrency = 'usd';

export interface CoingeckoSimpleParams {
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

export interface CoingeckoSimplePriceParams extends CoingeckoSimpleParams {
	// id of coins, comma-separated if querying more than 1 coin (therefore an array join(","))
	ids: CoingeckoCoinsId | CoingeckoCoinsId[];
}

export interface CoingeckoSimpleTokenPriceParams extends CoingeckoSimpleParams {
	// The id of the platform issuing tokens (See asset_platforms endpoint for list of options)
	id: CoingeckoPlatformId;
	// The contract address of tokens, comma separated
	contract_addresses: string | string[];
}

export interface CoingeckoSimplePrice {
	usd: number;
	usd_market_cap?: number;
	usd_24h_vol?: number;
	usd_24h_change?: number;
	last_updated_at?: number;
}

export type CoingeckoSimplePriceResponse = Record<
	CoingeckoCoinsId | string,
	CoingeckoSimplePrice
>;
