import { EnvIcrcTokenMetadataSchema, EnvIcTokenSchema } from '$env/schema/env-icrc-token.schema';
import { EnvTokenSymbolSchema } from '$env/schema/env-token-common.schema';
import { isEthAddress } from '$lib/utils/account.utils';
import { isNullish } from '@dfinity/utils';
import * as z from 'zod/v4';

const EnvErc20ContractAddressSchema = z.custom<string>((data: unknown) => {
	if (isNullish(data) || typeof data !== 'string') {
		return false;
	}

	return isEthAddress(data);
}, 'Invalid ERC20 Contract Address');

export const EnvCkErc20TokenDataSchema = EnvIcTokenSchema.extend({
	erc20ContractAddress: EnvErc20ContractAddressSchema
});

export const EnvCkErc20WithMetadataSchema = z.object({
	...EnvCkErc20TokenDataSchema.shape,
	...EnvIcrcTokenMetadataSchema.shape
});

export const EnvCkErc20TokensRawSchema = z.record(
	EnvTokenSymbolSchema,
	z.array(EnvCkErc20TokenDataSchema)
);

export const EnvCkErc20TokensSchema = z.record(
	EnvTokenSymbolSchema,
	z.union([z.undefined(), EnvCkErc20TokenDataSchema])
);

export const EnvTokensCkErc20Schema = z.object({
	production: EnvCkErc20TokensSchema,
	staging: EnvCkErc20TokensSchema
});

export const EnvCkErc20TokensWithMetadataSchema = z.record(
	EnvTokenSymbolSchema,
	EnvCkErc20WithMetadataSchema
);
