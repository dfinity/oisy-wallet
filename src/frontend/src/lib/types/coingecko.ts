// https://www.coingecko.com/api/documentation

import type { EthAddress } from '$eth/types/address';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { Currency } from '$lib/enums/currency';
import type {
	CoingeckoCoinsIdSchema,
	CoingeckoPlatformIdSchema
} from '$lib/schema/coingecko.schema';
import type * as z from 'zod';

export type CoingeckoCoinsId = z.infer<typeof CoingeckoCoinsIdSchema>;

export type CoingeckoPlatformId = z.infer<typeof CoingeckoPlatformIdSchema>;

// Please, cross-reference the OISY supported currencies with the Coingecko API for supported currencies.
// *refers to curl -l https://api.coingecko.com/api/v3/simple/supported_vs_currencies
export type CoingeckoCurrency = Currency;

export interface CoingeckoSimpleParams {
	// vs_currency of coins, comma-separated if querying more than 1 vs_currency
	vs_currencies: CoingeckoCurrency | `${CoingeckoCurrency},${CoingeckoCurrency}`;

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

export type CoingeckoSimplePrice = {
	usd: number;
	usd_market_cap?: number;
	usd_24h_vol?: number;
	usd_24h_change?: number;
	last_updated_at?: number;
} & {
	[K in
		| Exclude<`${Currency}`, Currency.USD>
		| `${Exclude<Currency, Currency.USD>}_24h_change`]?: number;
};

export type CoingeckoSimpleTokenPrice = Omit<CoingeckoSimplePrice, 'usd_market_cap'> &
	Required<Pick<CoingeckoSimplePrice, 'usd_market_cap'>>;

export type CoingeckoResponse<T> = Record<CoingeckoCoinsId | LedgerCanisterIdText | EthAddress, T>;

export type CoingeckoSimplePriceResponse = CoingeckoResponse<CoingeckoSimplePrice>;

export type CoingeckoSimpleTokenPriceResponse = CoingeckoResponse<CoingeckoSimpleTokenPrice>;

export type CoingeckoPriceResponse =
	| CoingeckoSimplePriceResponse
	| CoingeckoSimpleTokenPriceResponse;
