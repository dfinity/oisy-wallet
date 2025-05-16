import { z } from 'zod';
import {
	BtcAddressSchema,
	EthAddressSchema,
	Icrcv2AccountIdSchema,
	SolAddressSchema
} from './address.schema';

export const TokenAccountIdSchema = z.union([
	Icrcv2AccountIdSchema.transform((data) => ({ Icrcv2: data })),
	BtcAddressSchema.transform((data) => ({ Btc: data })),
	EthAddressSchema.transform((data) => ({ Eth: data })),
	SolAddressSchema.transform((data) => ({ Sol: data }))
]);
