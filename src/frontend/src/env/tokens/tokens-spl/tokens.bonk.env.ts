import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import bonk from '$sol/assets/bonk.svg';
import type { RequiredSplToken } from '$sol/types/spl';

export const BONK_DECIMALS = 5;

export const BONK_SYMBOL = 'BONK';

export const BONK_TOKEN_ID: TokenId = parseTokenId(BONK_SYMBOL);

export const BONK_TOKEN: RequiredSplToken = {
	id: BONK_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'Bonk',
	symbol: BONK_SYMBOL,
	decimals: BONK_DECIMALS,
	icon: bonk,
	address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'
};
