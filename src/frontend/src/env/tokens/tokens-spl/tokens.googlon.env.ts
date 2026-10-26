import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { GOOGLON_TOKEN_GROUP } from '$env/tokens/groups/groups.googlon.env';
import googlon from '$eth/assets/googlon.png';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token } from '$sol/types/spl';

export const GOOGLON_DECIMALS = 9;

export const GOOGLON_SYMBOL = 'GOOGLon';

export const GOOGLON_TOKEN_ID: TokenId = parseTokenId(GOOGLON_SYMBOL);

export const GOOGLON_TOKEN: RequiredSpl2022Token = {
	id: GOOGLON_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: { code: 'spl' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Alphabet Class A (Ondo Tokenized)',
	symbol: GOOGLON_SYMBOL,
	decimals: GOOGLON_DECIMALS,
	icon: googlon,
	address: 'bbahNA5vT9WJeYft8tALrH1LXWffjwqVoUbqYa1ondo',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: '9foMHsSDq7nMg4WPusSz9eY7tyxyukqborA8GyU5cUxD',
	freezeAuthority: '51QVCuHfL1FeNjd8BDeffCKhCcAYoULnVB3yjNhShiuK',
	groupData: GOOGLON_TOKEN_GROUP
};
