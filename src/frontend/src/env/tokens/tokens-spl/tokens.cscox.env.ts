import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import cscox from '$sol/assets/cscox.svg';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token } from '$sol/types/spl';

export const CSCOX_DECIMALS = 8;

export const CSCOX_SYMBOL = 'CSCOx';

export const CSCOX_TOKEN_ID: TokenId = parseTokenId(CSCOX_SYMBOL);

export const CSCOX_TOKEN: RequiredSpl2022Token = {
	id: CSCOX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'Cisco xStock',
	symbol: CSCOX_SYMBOL,
	decimals: CSCOX_DECIMALS,
	icon: cscox,
	address: 'Xsr3pdLQyXvDJBFgpR5nexCEZwXvigb8wbPYp4YoNFf',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs',
	freezeAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs'
};
