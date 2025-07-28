import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseSolAddress } from '$lib/validation/address.validation';
import { parseTokenId } from '$lib/validation/token.validation';
import gmex from '$sol/assets/gmex.svg';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSplToken } from '$sol/types/spl';

export const GMEX_DECIMALS = 8;

export const GMEX_SYMBOL = 'GMEx';

export const GMEX_TOKEN_ID: TokenId = parseTokenId(GMEX_SYMBOL);

export const GMEX_TOKEN: RequiredSplToken = {
	id: GMEX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'Gamestop xStock',
	symbol: GMEX_SYMBOL,
	decimals: GMEX_DECIMALS,
	icon: gmex,
	address: parseSolAddress('Xsf9mBktVB9BSU5kf4nHxPq5hCBJ2j2ui3ecFGxPRGc'),
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: parseSolAddress('JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs'),
	freezeAuthority: parseSolAddress('JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs')
};
