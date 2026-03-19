import type {
	NetworkEnvironmentSchema,
	NetworkExchangeSchema,
	NetworkIdSchema,
	NetworkOpenCryptoPaySchema,
	NetworkSchema
} from '$lib/schema/network.schema';
import type { Nullish } from '@dfinity/zod-schemas';
import type * as z from 'zod';

export type NetworkId = z.infer<typeof NetworkIdSchema>;

export type NetworkEnvironment = z.infer<typeof NetworkEnvironmentSchema>;

export type Network = z.infer<typeof NetworkSchema>;

export type NetworkExchange = z.infer<typeof NetworkExchangeSchema>;

export type NetworkOpenCryptoPay = z.infer<typeof NetworkOpenCryptoPaySchema>;

export type OptionNetworkId = Nullish<NetworkId>;
