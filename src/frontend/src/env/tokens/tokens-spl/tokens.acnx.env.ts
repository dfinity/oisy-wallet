import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import acnx from '$sol/assets/acnx.svg';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token, RequiredSplToken } from '$sol/types/spl';

export const ACNX_DECIMALS = 8;

export const ACNX_SYMBOL = 'ACNx';

export const ACNX_TOKEN_ID: TokenId = parseTokenId(ACNX_SYMBOL);

export const ACNX_TOKEN: RequiredSpl2022Token = {
	id: ACNX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'Accenture xStock',
	symbol: ACNX_SYMBOL,
	decimals: ACNX_DECIMALS,
	icon: acnx,
	address: 'Xs5UJzmCRQ8DWZjskExdSQDnbE6iLkRu2jjrRAB1JSU',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs',
	freezeAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs'
};
