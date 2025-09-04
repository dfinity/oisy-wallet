import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import gldx from '$sol/assets/gldx.svg';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token, RequiredSplToken } from '$sol/types/spl';

export const GLDX_DECIMALS = 8;

export const GLDX_SYMBOL = 'GLDx';

export const GLDX_TOKEN_ID: TokenId = parseTokenId(GLDX_SYMBOL);

export const GLDX_TOKEN: RequiredSpl2022Token = {
	id: GLDX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'Gold xStock',
	symbol: GLDX_SYMBOL,
	decimals: GLDX_DECIMALS,
	icon: gldx,
	address: 'Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs',
	freezeAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs'
};
