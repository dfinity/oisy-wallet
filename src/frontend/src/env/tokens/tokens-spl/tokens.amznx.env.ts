import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import amznx from '$sol/assets/amznx.svg';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSplToken } from '$sol/types/spl';

export const AMZNX_DECIMALS = 8;

export const AMZNX_SYMBOL = 'AMZNx';

export const AMZNX_TOKEN_ID: TokenId = parseTokenId(AMZNX_SYMBOL);

export const AMZNX_TOKEN: RequiredSplToken = {
	id: AMZNX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'Amazon xStock',
	symbol: AMZNX_SYMBOL,
	decimals: AMZNX_DECIMALS,
	icon: amznx,
	address: 'Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs',
	freezeAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs'
};
