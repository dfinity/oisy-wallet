import { EnvIcTokenSchema } from '$env/schema/env-icrc-token.schema';
import { envTokenSymbol } from '$env/types/env-token-common';
import { isEthAddress } from '$lib/utils/account.utils';
import { z } from 'zod';

const EnvErc20ContractAddressSchema = z.custom<string>(
	isEthAddress,
	'Invalid ERC20 Contract Address'
);

const EnvCkErc20TokenDataSchema = EnvIcTokenSchema.extend({
	erc20ContractAddress: EnvErc20ContractAddressSchema
});

export const EnvCkErc20TokensSchema = z.record(
	envTokenSymbol,
	z.union([z.undefined(), EnvCkErc20TokenDataSchema])
);

export const EnvTokensCkErc20Schema = z.object({
	production: EnvCkErc20TokensSchema,
	staging: EnvCkErc20TokensSchema
});
