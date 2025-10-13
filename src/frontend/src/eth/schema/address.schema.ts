import { AddressSchema } from '$lib/schema/address.schema';
import { isEthAddress } from '$lib/utils/account.utils';

export const EthAddressSchema = AddressSchema.refine((val) => isEthAddress(val));

export const EthAddressObjectSchema = EthAddressSchema.transform((v) => ({ Public: v }));
