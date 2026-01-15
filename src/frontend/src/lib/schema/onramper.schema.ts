import * as z from 'zod';

// The list of networks that are supported by Onramper can be found here:
// https://docs.onramper.com/docs/network-support
export const OnramperNetworkIdSchema = z.enum([
	'icp',
	'bitcoin',
	'ethereum',
	'solana',
	'base',
	'bsc',
	'polygon',
	'arbitrum'
]);

// The list of cryptocurrencies that are supported by Onramper can be found here:
// https://docs.onramper.com/docs/crypto-asset-support
export const OnramperIdSchema = z.string();
