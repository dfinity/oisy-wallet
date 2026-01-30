import { AddressSchema } from '$lib/schema/address.schema';

import { isEthAddress } from '$eth/utils/account.utils';

export const EthAddressSchema = AddressSchema.refine((val) => isEthAddress(val));

export const EthAddressObjectSchema = EthAddressSchema.transform((v) => ({ Public: v }));
