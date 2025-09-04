import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import tqqqx from '$sol/assets/tqqqx.svg';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token } from '$sol/types/spl';

export const TQQQX_DECIMALS = 8;

export const TQQQX_SYMBOL = 'TQQQx';

export const TQQQX_TOKEN_ID: TokenId = parseTokenId(TQQQX_SYMBOL);

export const TQQQX_TOKEN: RequiredSpl2022Token = {
	id: TQQQX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'TQQQ xStock',
	symbol: TQQQX_SYMBOL,
	decimals: TQQQX_DECIMALS,
	icon: tqqqx,
	address: 'XsjQP3iMAaQ3kQScQKthQpx9ALRbjKAjQtHg6TFomoc',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs',
	freezeAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs'
};
