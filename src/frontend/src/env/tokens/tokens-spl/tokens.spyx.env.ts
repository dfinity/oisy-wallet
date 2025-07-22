import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import spyx from '$sol/assets/spyx.svg';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSplToken } from '$sol/types/spl';

export const SPYX_DECIMALS = 8;

export const SPYX_SYMBOL = 'SPYx';

export const SPYX_TOKEN_ID: TokenId = parseTokenId(SPYX_SYMBOL);

export const SPYX_TOKEN: RequiredSplToken = {
	id: SPYX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'SP500 xStock',
	symbol: SPYX_SYMBOL,
	decimals: SPYX_DECIMALS,
	icon: spyx,
	address: 'XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs',
	freezeAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs'
};
