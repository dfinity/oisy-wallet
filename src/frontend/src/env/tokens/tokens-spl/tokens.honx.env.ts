import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import honx from '$sol/assets/honx.svg';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token, RequiredSplToken } from '$sol/types/spl';

export const HONX_DECIMALS = 8;

export const HONX_SYMBOL = 'HONx';

export const HONX_TOKEN_ID: TokenId = parseTokenId(HONX_SYMBOL);

export const HONX_TOKEN: RequiredSpl2022Token = {
	id: HONX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'Honeywell xStock',
	symbol: HONX_SYMBOL,
	decimals: HONX_DECIMALS,
	icon: honx,
	address: 'XsRbLZthfABAPAfumWNEJhPyiKDW6TvDVeAeW7oKqA2',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs',
	freezeAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs'
};
