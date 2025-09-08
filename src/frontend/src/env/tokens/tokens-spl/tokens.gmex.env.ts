import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import gmex from '$sol/assets/gmex.svg';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token } from '$sol/types/spl';

export const GMEX_DECIMALS = 8;

export const GMEX_SYMBOL = 'GMEx';

export const GMEX_TOKEN_ID: TokenId = parseTokenId(GMEX_SYMBOL);

export const GMEX_TOKEN: RequiredSpl2022Token = {
	id: GMEX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'Gamestop xStock',
	symbol: GMEX_SYMBOL,
	decimals: GMEX_DECIMALS,
	icon: gmex,
	address: 'Xsf9mBktVB9BSU5kf4nHxPq5hCBJ2j2ui3ecFGxPRGc',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs',
	freezeAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs'
};
