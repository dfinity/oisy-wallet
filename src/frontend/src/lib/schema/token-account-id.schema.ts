import {
	BtcAddressObjectSchema,
	EthAddressObjectSchema,
	Icrcv2AccountIdObjectSchema,
	SolAddressSchema
} from '$lib/schema/address.schema';
import { z } from 'zod';

export const TokenAccountIdSchema = z.union([
	Icrcv2AccountIdObjectSchema.transform((data) => ({ Icrcv2: data })),
	BtcAddressObjectSchema.transform((data) => ({ Btc: data })),
	EthAddressObjectSchema.transform((data) => ({ Eth: data })),
	SolAddressSchema.transform((data) => ({ Sol: data }))
]);
