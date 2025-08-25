import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { SPX_TOKEN_GROUP } from '$env/tokens/groups/groups.spx.env';
import spx from '$eth/assets/spx.png';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { TOKEN_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSplToken } from '$sol/types/spl';

export const SPX_DECIMALS = 8;

export const SPX_SYMBOL = 'SPX';

export const SPX_TOKEN_ID: TokenId = parseTokenId(SPX_SYMBOL);

export const SPX_TOKEN: RequiredSplToken = {
	id: SPX_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: 'spl',
	category: 'default',
	name: 'SPX6900 (Wormhole)',
	symbol: SPX_SYMBOL,
	decimals: SPX_DECIMALS,
	icon: spx,
	address: 'J3NKxxXZcnNiMjKw9hYb2K4LUxgwB6t1FtPtQVsv3KFr',
	owner: TOKEN_PROGRAM_ADDRESS,
	groupData: SPX_TOKEN_GROUP
};
