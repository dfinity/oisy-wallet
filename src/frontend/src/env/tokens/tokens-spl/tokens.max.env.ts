import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import max from '$sol/assets/max.svg';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token } from '$sol/types/spl';

export const MAX_DECIMALS = 8;

export const MAX_SYMBOL = 'MAx';

export const MAX_TOKEN_ID: TokenId = parseTokenId(MAX_SYMBOL);

export const MAX_TOKEN: RequiredSpl2022Token = {
	id: MAX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'Mastercard xStock',
	symbol: MAX_SYMBOL,
	decimals: MAX_DECIMALS,
	icon: max,
	address: 'XsApJFV9MAktqnAc6jqzsHVujxkGm9xcSUffaBoYLKC',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs',
	freezeAuthority: 'JDq14BWvqCRFNu1krb12bcRpbGtJZ1FLEakMw6FdxJNs'
};
