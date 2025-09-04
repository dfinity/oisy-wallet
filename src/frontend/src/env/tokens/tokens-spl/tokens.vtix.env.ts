import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import vtix from '$sol/assets/vtix.svg';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token, RequiredSplToken } from '$sol/types/spl';

export const VTIX_DECIMALS = 8;

export const VTIX_SYMBOL = 'VTIx';

export const VTIX_TOKEN_ID: TokenId = parseTokenId(VTIX_SYMBOL);

export const VTIX_TOKEN: RequiredSpl2022Token = {
	id: VTIX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'Vanguard xStock',
	symbol: VTIX_SYMBOL,
	decimals: VTIX_DECIMALS,
	icon: vtix,
	address: 'XsssYEQjzxBCFgvYFFNuhJFBeHNdLWYeUSP8F45cDr9',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs',
	freezeAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs'
};
