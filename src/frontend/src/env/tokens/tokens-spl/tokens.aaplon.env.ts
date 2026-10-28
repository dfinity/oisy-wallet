import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { AAPLON_TOKEN_GROUP } from '$env/tokens/groups/groups.aaplon.env';
import aaplon from '$eth/assets/aaplon.png';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token } from '$sol/types/spl';

export const AAPLON_DECIMALS = 9;

export const AAPLON_SYMBOL = 'AAPLon';

export const AAPLON_TOKEN_ID: TokenId = parseTokenId(AAPLON_SYMBOL);

export const AAPLON_TOKEN: RequiredSpl2022Token = {
	id: AAPLON_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: { code: 'spl' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Apple (Ondo Tokenized)',
	symbol: AAPLON_SYMBOL,
	decimals: AAPLON_DECIMALS,
	icon: aaplon,
	address: '123mYEnRLM2LLYsJW3K6oyYh8uP1fngj732iG638ondo',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: '9foMHsSDq7nMg4WPusSz9eY7tyxyukqborA8GyU5cUxD',
	freezeAuthority: '51QVCuHfL1FeNjd8BDeffCKhCcAYoULnVB3yjNhShiuK',
	groupData: AAPLON_TOKEN_GROUP
};
