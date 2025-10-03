import * as z from 'zod';

// We are only interested in specific coin <> USD for now, therefore not an exhaustive list.
// *refers to curl -l https://api.coingecko.com/api/v3/coins/list
export const CoingeckoCoinsIdSchema = z.enum([
	'ethereum',
	'bitcoin',
	'internet-computer',
	'solana',
	'binancecoin',
	'polygon-ecosystem-token',
	'arbitrum-one'
]);

// We are interested only in the ERC20 <> USD on Ethereum and in the ICRC <> USD on Internet Computer, therefore not an exhaustive list.
// *refers to curl -l https://api.coingecko.com/api/v3/asset_platforms
export const CoingeckoPlatformIdSchema = z.enum([
	'ethereum',
	'internet-computer',
	'solana',
	'base',
	'binance-smart-chain',
	'polygon-pos',
	'arbitrum-one'
]);
