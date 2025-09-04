import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import unhx from '$sol/assets/unhx.svg';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token, RequiredSplToken } from '$sol/types/spl';

export const UNHX_DECIMALS = 8;

export const UNHX_SYMBOL = 'UNHx';

export const UNHX_TOKEN_ID: TokenId = parseTokenId(UNHX_SYMBOL);

export const UNHX_TOKEN: RequiredSpl2022Token = {
	id: UNHX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'UnitedHealth xStock',
	symbol: UNHX_SYMBOL,
	decimals: UNHX_DECIMALS,
	icon: unhx,
	address: 'XszvaiXGPwvk2nwb3o9C1CX4K6zH8sez11E6uyup6fe',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs',
	freezeAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs'
};
