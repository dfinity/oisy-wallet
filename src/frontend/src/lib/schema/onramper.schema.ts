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
	'arbitrum',
	'robinhood'
]);

// The list of cryptocurrencies that are supported by Onramper can be found here:
// https://docs.onramper.com/docs/crypto-asset-support
export const OnramperIdSchema = z.string();

// The fields OISY reads from a token of OnRamper's list of supported tokens (`GET /supported`):
// https://docs.onramper.com/reference/get_supported
export const OnramperSupportedCryptoSchema = z.object({
	id: OnramperIdSchema,
	network: z.string(),
	address: z.string().nullish()
});

// The tokens are checked one by one, so a malformed token leaves out only itself.
export const OnramperSupportedResponseSchema = z.object({
	message: z.object({
		crypto: z.array(z.unknown())
	})
});
