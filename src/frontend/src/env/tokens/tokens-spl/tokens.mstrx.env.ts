import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import mstrx from '$sol/assets/mstrx.svg';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSplToken } from '$sol/types/spl';

export const MSTRX_DECIMALS = 8;

export const MSTRX_SYMBOL = 'MSTRx';

export const MSTRX_TOKEN_ID: TokenId = parseTokenId(MSTRX_SYMBOL);

export const MSTRX_TOKEN: RequiredSplToken = {
	id: MSTRX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'MicroStrategy xStock',
	symbol: MSTRX_SYMBOL,
	decimals: MSTRX_DECIMALS,
	icon: mstrx,
	address: 'XsP7xzNPvEHS1m6qfanPUGjNmdnmsLKEoNAnHjdxxyZ',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs',
	freezeAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs'
};
