import { SOLANA_DEVNET_NETWORK } from '$env/networks/networks.sol.env';
import usdc from '$eth/assets/usdc.svg';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import type { RequiredSplToken } from '$sol/types/spl';

export const EURC_DECIMALS = 6;

export const EURC_SYMBOL = 'EURC';

export const DEVNET_EURC_SYMBOL = 'DevnetEURC';

export const DEVNET_EURC_TOKEN_ID: TokenId = parseTokenId(DEVNET_EURC_SYMBOL);

export const DEVNET_EURC_TOKEN: RequiredSplToken = {
	id: DEVNET_EURC_TOKEN_ID,
	network: SOLANA_DEVNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'EURC (Devnet)',
	symbol: EURC_SYMBOL,
	decimals: EURC_DECIMALS,
	icon: usdc,
	address: 'HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr'
};
