import { envIcToken } from '$env/types/env-icrc-token';
import { envTokenSymbol } from '$env/types/env-token-common';
import { isEthAddress } from '$lib/utils/account.utils';
import { z } from 'zod';

const envErc20ContractAddress = z.custom<string>(isEthAddress, 'Invalid ERC20 Contract Address');

const envCkErc20TokenData = envIcToken.extend({
	erc20ContractAddress: envErc20ContractAddress
});

const envCkErc20Tokens = z.record(envTokenSymbol, z.union([z.undefined(), envCkErc20TokenData]));

export type EnvCkErc20Tokens = z.infer<typeof envCkErc20Tokens>;

export const envTokensCkErc20 = z.object({
	production: envCkErc20Tokens,
	staging: envCkErc20Tokens
});
