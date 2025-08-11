import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import hoodx from '$sol/assets/hoodx.svg';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSplToken } from '$sol/types/spl';

export const HOODX_DECIMALS = 8;

export const HOODX_SYMBOL = 'HOODx';

export const HOODX_TOKEN_ID: TokenId = parseTokenId(HOODX_SYMBOL);

export const HOODX_TOKEN: RequiredSplToken = {
	id: HOODX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'Robinhood xStock',
	symbol: HOODX_SYMBOL,
	decimals: HOODX_DECIMALS,
	icon: hoodx,
	address: 'XsvNBAYkrDRNhA7wPHQfX3ZUXZyZLdnCQDfHZ56bzpg',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs',
	freezeAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs'
};
