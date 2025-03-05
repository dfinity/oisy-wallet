import { EnvIcTokenSchema } from '$env/schema/env-icrc-token.schema';
import { EnvTokenSymbolSchema } from '$env/schema/env-token-common.schema';
import { isEthAddress } from '$lib/utils/account.utils';
import * as z from 'zod';

const EnvErc20ContractAddressSchema = z.custom<string>(
	isEthAddress,
	'Invalid ERC20 Contract Address'
);

export const EnvCkErc20TokenDataSchema = EnvIcTokenSchema.extend({
	erc20ContractAddress: EnvErc20ContractAddressSchema
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
