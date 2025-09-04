import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import hdx from '$sol/assets/hdx.svg';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token, RequiredSplToken } from '$sol/types/spl';

export const HDX_DECIMALS = 8;

export const HDX_SYMBOL = 'HDx';

export const HDX_TOKEN_ID: TokenId = parseTokenId(HDX_SYMBOL);

export const HDX_TOKEN: RequiredSpl2022Token = {
	id: HDX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'Home Depot xStock',
	symbol: HDX_SYMBOL,
	decimals: HDX_DECIMALS,
	icon: hdx,
	address: 'XszjVtyhowGjSC5odCqBpW1CtXXwXjYokymrk7fGKD3',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs',
	freezeAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs'
};
