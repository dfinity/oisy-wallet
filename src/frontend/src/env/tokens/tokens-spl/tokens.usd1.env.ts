import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { USD1_TOKEN_GROUP } from '$env/tokens/groups/groups.usd1.env';
import usd1 from '$eth/assets/usd1.webp';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { TOKEN_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSplToken } from '$sol/types/spl';

export const USD1_DECIMALS = 6;

export const USD1_SYMBOL = 'USD1';

export const USD1_TOKEN_ID: TokenId = parseTokenId(USD1_SYMBOL);

export const USD1_TOKEN: RequiredSplToken = {
	id: USD1_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: { code: 'spl' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STABLECOIN }],
	name: 'World Liberty Financial USD',
	symbol: USD1_SYMBOL,
	decimals: USD1_DECIMALS,
	icon: usd1,
	address: 'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB',
	owner: TOKEN_PROGRAM_ADDRESS,
	groupData: USD1_TOKEN_GROUP
};
