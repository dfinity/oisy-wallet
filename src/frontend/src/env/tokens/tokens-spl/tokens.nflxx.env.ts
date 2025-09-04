import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import nflxx from '$sol/assets/nflxx.svg';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token, RequiredSplToken } from '$sol/types/spl';

export const NFLXX_DECIMALS = 8;

export const NFLXX_SYMBOL = 'NFLXx';

export const NFLXX_TOKEN_ID: TokenId = parseTokenId(NFLXX_SYMBOL);

export const NFLXX_TOKEN: RequiredSpl2022Token = {
	id: NFLXX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'Netflix xStock',
	symbol: NFLXX_SYMBOL,
	decimals: NFLXX_DECIMALS,
	icon: nflxx,
	address: 'XsEH7wWfJJu2ZT3UCFeVfALnVA6CP5ur7Ee11KmzVpL',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs',
	freezeAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs'
};
