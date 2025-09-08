import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import aznx from '$sol/assets/aznx.svg';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token } from '$sol/types/spl';

export const AZNX_DECIMALS = 8;

export const AZNX_SYMBOL = 'AZNx';

export const AZNX_TOKEN_ID: TokenId = parseTokenId(AZNX_SYMBOL);

export const AZNX_TOKEN: RequiredSpl2022Token = {
	id: AZNX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'AstraZeneca xStock',
	symbol: AZNX_SYMBOL,
	decimals: AZNX_DECIMALS,
	icon: aznx,
	address: 'Xs3ZFkPYT2BN7qBMqf1j1bfTeTm1rFzEFSsQ1z3wAKU',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs',
	freezeAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs'
};
