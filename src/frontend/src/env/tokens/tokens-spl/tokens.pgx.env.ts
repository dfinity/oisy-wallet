import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import pgx from '$sol/assets/pgx.svg';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSplToken } from '$sol/types/spl';

export const PGX_DECIMALS = 8;

export const PGX_SYMBOL = 'PGx';

export const PGX_TOKEN_ID: TokenId = parseTokenId(PGX_SYMBOL);

export const PGX_TOKEN: RequiredSplToken = {
	id: PGX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'Procter & Gamble xStock',
	symbol: PGX_SYMBOL,
	decimals: PGX_DECIMALS,
	icon: pgx,
	address: 'XsYdjDjNUygZ7yGKfQaB6TxLh2gC6RRjzLtLAGJrhzV',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs',
	freezeAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs'
};
