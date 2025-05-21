import { z } from 'zod';
import { BtcAddressObjectSchema, EthAddressObjectSchema, SolAddressSchema } from './address.schema';

export const TokenAccountIdSchema = z.union([
	// TODO: PR https://github.com/dfinity/oisy-wallet/pull/6716
	// Icrcv2AccountIdObjectSchema.transform((data) => ({ Icrcv2: data })),
	BtcAddressObjectSchema.transform((data) => ({ Btc: data })),
	EthAddressObjectSchema.transform((data) => ({ Eth: data })),
	SolAddressSchema.transform((data) => ({ Sol: data }))
]);
