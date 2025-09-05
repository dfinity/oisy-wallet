import * as z from 'zod/v4';

export const CoingeckoCoinsIdSchema = z.enum([
	'ethereum',
	'bitcoin',
	'internet-computer',
	'solana',
	'binancecoin',
	'polygon-ecosystem-token',
	'arbitrum-one'
]);
