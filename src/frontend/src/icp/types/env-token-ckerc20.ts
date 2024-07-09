import { isEthAddress } from '$lib/utils/account.utils';
import { z } from 'zod';

const envErc20ContractAddress = z.custom<string>(isEthAddress, 'Invalid ERC20 Contract Address');

const envTokenData = z.object({
	ledgerCanisterId: z.string(),
	indexCanisterId: z.string(),
	erc20ContractAddress: envErc20ContractAddress
});

const envTokenSymbol = z.string();

export type EnvTokenSymbol = z.infer<typeof envTokenSymbol>;

const envTokens = z.record(envTokenSymbol, z.union([z.undefined(), envTokenData]));

export type EnvTokens = z.infer<typeof envTokens>;

export const envTokensCkErc20 = z.object({
	production: envTokens,
	staging: envTokens
});
