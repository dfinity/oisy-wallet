import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import aaplx from '$sol/assets/aaplx.svg';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token, RequiredSplToken } from '$sol/types/spl';

export const AAPLX_DECIMALS = 8;

export const AAPLX_SYMBOL = 'AAPLx';

export const AAPLX_TOKEN_ID: TokenId = parseTokenId(AAPLX_SYMBOL);

export const AAPLX_TOKEN: RequiredSpl2022Token = {
	id: AAPLX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'Apple xStock',
	symbol: AAPLX_SYMBOL,
	decimals: AAPLX_DECIMALS,
	icon: aaplx,
	address: 'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs',
	freezeAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs'
};
