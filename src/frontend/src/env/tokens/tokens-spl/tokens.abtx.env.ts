import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseSolAddress } from '$lib/validation/address.validation';
import { parseTokenId } from '$lib/validation/token.validation';
import abtx from '$sol/assets/abtx.svg';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSplToken } from '$sol/types/spl';

export const ABTX_DECIMALS = 8;

export const ABTX_SYMBOL = 'ABTx';

export const ABTX_TOKEN_ID: TokenId = parseTokenId(ABTX_SYMBOL);

export const ABTX_TOKEN: RequiredSplToken = {
	id: ABTX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'Abbott xStock',
	symbol: ABTX_SYMBOL,
	decimals: ABTX_DECIMALS,
	icon: abtx,
	address: parseSolAddress('XsHtf5RpxsQ7jeJ9ivNewouZKJHbPxhPoEy6yYvULr7'),
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: parseSolAddress('JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs'),
	freezeAuthority: parseSolAddress('JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs')
};
