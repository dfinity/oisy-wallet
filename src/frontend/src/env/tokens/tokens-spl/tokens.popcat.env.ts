import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import popcat from '$sol/assets/popcat.svg';
import type { RequiredSplToken } from '$sol/types/spl';

export const POPCAT_DECIMALS = 6;

export const POPCAT_SYMBOL = 'POPCAT';

export const POPCAT_TOKEN_ID: TokenId = parseTokenId(POPCAT_SYMBOL);

export const POPCAT_TOKEN: RequiredSplToken = {
	id: POPCAT_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'POPCAT',
	symbol: POPCAT_SYMBOL,
	decimals: POPCAT_DECIMALS,
	icon: popcat,
	address: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',
	programAddress: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
};
