import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import googlx from '$sol/assets/googlx.svg';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSplToken } from '$sol/types/spl';

export const GOOGLX_DECIMALS = 8;

export const GOOGLX_SYMBOL = 'GOOGLx';

export const GOOGLX_TOKEN_ID: TokenId = parseTokenId(GOOGLX_SYMBOL);

export const GOOGLX_TOKEN: RequiredSplToken = {
	id: GOOGLX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'Alphabet xStock',
	symbol: GOOGLX_SYMBOL,
	decimals: GOOGLX_DECIMALS,
	icon: googlx,
	address: 'XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs',
	freezeAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs'
};
