import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import llyx from '$sol/assets/llyx.svg';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSplToken } from '$sol/types/spl';

export const LLYX_DECIMALS = 8;

export const LLYX_SYMBOL = 'LLYx';

export const LLYX_TOKEN_ID: TokenId = parseTokenId(LLYX_SYMBOL);

export const LLYX_TOKEN: RequiredSplToken = {
	id: LLYX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'Eli Lilly xStock',
	symbol: LLYX_SYMBOL,
	decimals: LLYX_DECIMALS,
	icon: llyx,
	address: 'Xsnuv4omNoHozR6EEW5mXkw8Nrny5rB3jVfLqi6gKMH',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs',
	freezeAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs'
};
