import { z } from 'zod';
import {
	BtcAddressSchema,
	EthAddressSchema,
	SolAddressSchema
} from './address.schema';

export const TokenAccountIdSchema = z.union([
	// TODO: PR https://github.com/dfinity/oisy-wallet/pull/6716
	// Icrcv2AccountIdObjectSchema.transform((data) => ({ Icrcv2: data })),
	BtcAddressSchema.transform((data) => ({ Btc: data })),
	EthAddressSchema.transform((data) => ({ Eth: data })),
	SolAddressSchema.transform((data) => ({ Sol: data }))
]);
