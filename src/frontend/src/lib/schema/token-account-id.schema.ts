import { BtcAddressObjectSchema } from '$btc/schema/address.schema';
import { EthAddressObjectSchema } from '$eth/schema/address.schema';
import { KaspaAddressObjectSchema } from '$kaspa/schema/address.schema';
import { TOKEN_ACCOUNT_ID_TYPES } from '$lib/constants/token-account-id.constants';
import { Icrcv2AccountIdObjectSchema } from '$lib/schema/address.schema';
import { SolAddressSchema } from '$sol/schema/address.schema';
import { z } from 'zod';

export const TokenAccountIdSchema = z.union([
	Icrcv2AccountIdObjectSchema.transform((data) => ({ Icrcv2: data })),
	BtcAddressObjectSchema.transform((data) => ({ Btc: data })),
	EthAddressObjectSchema.transform((data) => ({ Eth: data })),
	SolAddressSchema.transform((data) => ({ Sol: data })),
	KaspaAddressObjectSchema.transform((data) => ({ Kaspa: data }))
]);

export const TokenAccountIdTypesSchema = z.enum(TOKEN_ACCOUNT_ID_TYPES);
