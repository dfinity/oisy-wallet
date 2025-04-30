import { SOLANA_DEVNET_NETWORK, SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { EURC_TOKEN_GROUP } from '$env/tokens/groups/groups.eurc.env';
import eurc from '$eth/assets/eurc.svg';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { TOKEN_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSplToken } from '$sol/types/spl';

export const EURC_DECIMALS = 6;

export const EURC_SYMBOL = 'EURC';

export const EURC_TOKEN_ID: TokenId = parseTokenId(EURC_SYMBOL);

export const EURC_TOKEN: RequiredSplToken = {
	id: EURC_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'Euro Coin',
	symbol: EURC_SYMBOL,
	decimals: EURC_DECIMALS,
	icon: eurc,
	address: 'HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr',
	owner: TOKEN_PROGRAM_ADDRESS,
	groupData: EURC_TOKEN_GROUP,
	buy: {
		onramperId: 'eurc_solana'
	}
};

export const DEVNET_EURC_SYMBOL = 'DevnetEURC';

export const DEVNET_EURC_TOKEN_ID: TokenId = parseTokenId(DEVNET_EURC_SYMBOL);

export const DEVNET_EURC_TOKEN: RequiredSplToken = {
	id: DEVNET_EURC_TOKEN_ID,
	network: SOLANA_DEVNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'EURC (Devnet)',
	symbol: DEVNET_EURC_SYMBOL,
	decimals: EURC_DECIMALS,
	icon: eurc,
	address: 'HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr',
	owner: TOKEN_PROGRAM_ADDRESS
};
