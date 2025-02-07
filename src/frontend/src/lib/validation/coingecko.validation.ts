import * as z from 'zod';

export const CoingeckoCoinsIdSchema = z.enum([
	'ethereum',
	'bitcoin',
	'internet-computer',
	'solana'
]);
