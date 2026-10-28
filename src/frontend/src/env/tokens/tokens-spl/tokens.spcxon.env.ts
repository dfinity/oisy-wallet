import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { SPCXON_TOKEN_GROUP } from '$env/tokens/groups/groups.spcxon.env';
import spcxon from '$eth/assets/spcxon.png';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token } from '$sol/types/spl';

export const SPCXON_DECIMALS = 9;

export const SPCXON_SYMBOL = 'SPCXon';

export const SPCXON_TOKEN_ID: TokenId = parseTokenId(SPCXON_SYMBOL);

export const SPCXON_TOKEN: RequiredSpl2022Token = {
	id: SPCXON_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: { code: 'spl' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'SpaceX (Ondo Tokenized)',
	symbol: SPCXON_SYMBOL,
	decimals: SPCXON_DECIMALS,
	icon: spcxon,
	address: 'wzAyQTorWyoVXuJKj2x8EqKEGJpS13z6EWE9z5Aondo',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: '9foMHsSDq7nMg4WPusSz9eY7tyxyukqborA8GyU5cUxD',
	groupData: SPCXON_TOKEN_GROUP
};
