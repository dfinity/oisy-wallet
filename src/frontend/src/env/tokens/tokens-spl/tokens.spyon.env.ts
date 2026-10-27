import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { SPYON_TOKEN_GROUP } from '$env/tokens/groups/groups.spyon.env';
import spyon from '$eth/assets/spyon.png';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token } from '$sol/types/spl';

export const SPYON_DECIMALS = 9;

export const SPYON_SYMBOL = 'SPYon';

export const SPYON_TOKEN_ID: TokenId = parseTokenId(SPYON_SYMBOL);

export const SPYON_TOKEN: RequiredSpl2022Token = {
	id: SPYON_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: { code: 'spl' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'SPDR S&P 500 ETF (Ondo Tokenized)',
	symbol: SPYON_SYMBOL,
	decimals: SPYON_DECIMALS,
	icon: spyon,
	address: 'k18WJUULWheRkSpSquYGdNNmtuE2Vbw1hpuUi92ondo',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: '9foMHsSDq7nMg4WPusSz9eY7tyxyukqborA8GyU5cUxD',
	freezeAuthority: '51QVCuHfL1FeNjd8BDeffCKhCcAYoULnVB3yjNhShiuK',
	groupData: SPYON_TOKEN_GROUP
};
