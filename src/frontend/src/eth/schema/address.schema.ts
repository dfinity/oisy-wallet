import { isEthAddress } from '$eth/utils/account.utils';
import { AddressSchema } from '$lib/schema/address.schema';

export const EthAddressSchema = AddressSchema.refine((val) => isEthAddress(val));

export const EthAddressObjectSchema = EthAddressSchema.transform((v) => ({ Public: v }));
