import { envIcToken } from '$env/types/env-icrc-token';
import { envTokenSymbol } from '$env/types/env-token-common';
import { isEthAddress } from '$lib/utils/account.utils';
import { z } from 'zod';

const envErc20ContractAddress = z.custom<string>(isEthAddress, 'Invalid ERC20 Contract Address');

const envTokenData = envIcToken.extend({
	erc20ContractAddress: envErc20ContractAddress
});

const envTokens = z.record(envTokenSymbol, z.union([z.undefined(), envTokenData]));

export type EnvCkErc20Tokens = z.infer<typeof envTokens>;

export const envTokensCkErc20 = z.object({
	production: envTokens,
	staging: envTokens
});
