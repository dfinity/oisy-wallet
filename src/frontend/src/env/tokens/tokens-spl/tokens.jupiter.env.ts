import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import jupiter from '$sol/assets/jupiter.svg';
import type { RequiredSplToken } from '$sol/types/spl';

export const JUPITER_DECIMALS = 6;

export const JUPITER_SYMBOL = 'JUPITER';

export const JUPITER_TOKEN_ID: TokenId = parseTokenId(JUPITER_SYMBOL);

export const JUPITER_TOKEN: RequiredSplToken = {
	id: JUPITER_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'Jupiter',
	symbol: JUPITER_SYMBOL,
	decimals: JUPITER_DECIMALS,
	icon: jupiter,
	address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'
};
