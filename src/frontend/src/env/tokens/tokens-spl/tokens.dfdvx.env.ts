import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import dfdvx from '$sol/assets/dfdvx.svg';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSplToken } from '$sol/types/spl';

export const DFDVX_DECIMALS = 8;

export const DFDVX_SYMBOL = 'DFDVx';

export const DFDVX_TOKEN_ID: TokenId = parseTokenId(DFDVX_SYMBOL);

export const DFDVX_TOKEN: RequiredSplToken = {
	id: DFDVX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'DFDV xStock',
	symbol: DFDVX_SYMBOL,
	decimals: DFDVX_DECIMALS,
	icon: dfdvx,
	address: 'Xs2yquAgsHByNzx68WJC55WHjHBvG9JsMB7CWjTLyPy',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs',
	freezeAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs'
};
