import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import ambrx from '$sol/assets/ambrx.svg';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token, RequiredSplToken } from '$sol/types/spl';

export const AMBRX_DECIMALS = 8;

export const AMBRX_SYMBOL = 'AMBRx';

export const AMBRX_TOKEN_ID: TokenId = parseTokenId(AMBRX_SYMBOL);

export const AMBRX_TOKEN: RequiredSpl2022Token = {
	id: AMBRX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'Amber xStock',
	symbol: AMBRX_SYMBOL,
	decimals: AMBRX_DECIMALS,
	icon: ambrx,
	address: 'XsaQTCgebC2KPbf27KUhdv5JFvHhQ4GDAPURwrEhAzb',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs',
	freezeAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs'
};
