import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import mcdx from '$sol/assets/mcdx.svg';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token } from '$sol/types/spl';

export const MCDX_DECIMALS = 8;

export const MCDX_SYMBOL = 'MCDx';

export const MCDX_TOKEN_ID: TokenId = parseTokenId(MCDX_SYMBOL);

export const MCDX_TOKEN: RequiredSpl2022Token = {
	id: MCDX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: "McDonald's xStock",
	symbol: MCDX_SYMBOL,
	decimals: MCDX_DECIMALS,
	icon: mcdx,
	address: 'XsqE9cRRpzxcGKDXj1BJ7Xmg4GRhZoyY1KpmGSxAWT2',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs',
	freezeAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs'
};
