import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import avgox from '$sol/assets/avgox.svg';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token, RequiredSplToken } from '$sol/types/spl';

export const AVGOX_DECIMALS = 8;

export const AVGOX_SYMBOL = 'AVGOx';

export const AVGOX_TOKEN_ID: TokenId = parseTokenId(AVGOX_SYMBOL);

export const AVGOX_TOKEN: RequiredSpl2022Token = {
	id: AVGOX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'Broadcom xStock',
	symbol: AVGOX_SYMBOL,
	decimals: AVGOX_DECIMALS,
	icon: avgox,
	address: 'XsgSaSvNSqLTtFuyWPBhK9196Xb9Bbdyjj4fH3cPJGo',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs',
	freezeAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs'
};
