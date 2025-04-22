import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { USDT_TOKEN_GROUP } from '$env/tokens/groups/groups.usdt.env';
import { USDT_TOKEN as ETH_USDT_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdt.env';
import usdt from '$eth/assets/usdt.svg';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { TOKEN_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSplToken } from '$sol/types/spl';

export const USDT_DECIMALS = 6;

export const USDT_SYMBOL = 'USDT';

export const USDT_TOKEN_ID: TokenId = parseTokenId(USDT_SYMBOL);

export const USDT_TOKEN: RequiredSplToken = {
	id: USDT_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'Tether USD',
	symbol: USDT_SYMBOL,
	decimals: USDT_DECIMALS,
	icon: usdt,
	address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
	owner: TOKEN_PROGRAM_ADDRESS,
	// TODO: remove this prop when we will use `groupData` for grouping
	twinToken: ETH_USDT_TOKEN,
	groupData: USDT_TOKEN_GROUP,
	buy: {
		onramperId: 'usdt_solana'
	}
};
