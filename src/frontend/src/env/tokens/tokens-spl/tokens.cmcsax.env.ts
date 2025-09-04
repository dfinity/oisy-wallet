import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import cmcsax from '$sol/assets/cmcsax.svg';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token } from '$sol/types/spl';

export const CMCSAX_DECIMALS = 8;

export const CMCSAX_SYMBOL = 'CMCSAx';

export const CMCSAX_TOKEN_ID: TokenId = parseTokenId(CMCSAX_SYMBOL);

export const CMCSAX_TOKEN: RequiredSpl2022Token = {
	id: CMCSAX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'Comcast xStock',
	symbol: CMCSAX_SYMBOL,
	decimals: CMCSAX_DECIMALS,
	icon: cmcsax,
	address: 'XsvKCaNsxg2GN8jjUmq71qukMJr7Q1c5R2Mk9P8kcS8',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs',
	freezeAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs'
};
