import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import crclx from '$sol/assets/crclx.svg';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token } from '$sol/types/spl';

export const CRCLX_DECIMALS = 8;

export const CRCLX_SYMBOL = 'CRCLx';

export const CRCLX_TOKEN_ID: TokenId = parseTokenId(CRCLX_SYMBOL);

export const CRCLX_TOKEN: RequiredSpl2022Token = {
	id: CRCLX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'Circle xStock',
	symbol: CRCLX_SYMBOL,
	decimals: CRCLX_DECIMALS,
	icon: crclx,
	address: 'XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs',
	freezeAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs'
};
