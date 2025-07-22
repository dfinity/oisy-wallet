import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import pengu from '$sol/assets/pengu.png';
import { TOKEN_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSplToken } from '$sol/types/spl';

export const PENGU_DECIMALS = 6;

export const PENGU_SYMBOL = 'PENGU';

export const PENGU_TOKEN_ID: TokenId = parseTokenId(PENGU_SYMBOL);

export const PENGU_TOKEN: RequiredSplToken = {
	id: PENGU_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'Pudgy Penguins',
	symbol: PENGU_SYMBOL,
	decimals: PENGU_DECIMALS,
	icon: pengu,
	address: '2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv',
	owner: TOKEN_PROGRAM_ADDRESS
};
