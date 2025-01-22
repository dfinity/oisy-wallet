import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import jup from '$sol/assets/jup.svg';
import type { RequiredSplToken } from '$sol/types/spl';

export const JUP_DECIMALS = 6;

export const JUP_SYMBOL = 'JUP';

export const JUP_TOKEN_ID: TokenId = parseTokenId(JUP_SYMBOL);

export const JUP_TOKEN: RequiredSplToken = {
	id: JUP_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'Jupiter',
	symbol: JUP_SYMBOL,
	decimals: JUP_DECIMALS,
	icon: jup,
	address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'
};
