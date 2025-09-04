import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import tslax from '$sol/assets/tslax.svg';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token, RequiredSplToken } from '$sol/types/spl';

export const TSLAX_DECIMALS = 8;

export const TSLAX_SYMBOL = 'TSLAx';

export const TSLAX_TOKEN_ID: TokenId = parseTokenId(TSLAX_SYMBOL);

export const TSLAX_TOKEN: RequiredSpl2022Token = {
	id: TSLAX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'Tesla xStock',
	symbol: TSLAX_SYMBOL,
	decimals: TSLAX_DECIMALS,
	icon: tslax,
	address: 'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs',
	freezeAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs'
};
