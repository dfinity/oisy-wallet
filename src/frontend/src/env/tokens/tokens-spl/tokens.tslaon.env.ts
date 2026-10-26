import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { TSLAON_TOKEN_GROUP } from '$env/tokens/groups/groups.tslaon.env';
import tslaon from '$eth/assets/tslaon.png';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { TOKEN_2022_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSpl2022Token } from '$sol/types/spl';

export const TSLAON_DECIMALS = 9;

export const TSLAON_SYMBOL = 'TSLAon';

export const TSLAON_TOKEN_ID: TokenId = parseTokenId(TSLAON_SYMBOL);

export const TSLAON_TOKEN: RequiredSpl2022Token = {
	id: TSLAON_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: { code: 'spl' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.STOCK }],
	name: 'Tesla (Ondo Tokenized)',
	symbol: TSLAON_SYMBOL,
	decimals: TSLAON_DECIMALS,
	icon: tslaon,
	address: 'KeGv7bsfR4MheC1CkmnAVceoApjrkvBhHYjWb67ondo',
	owner: TOKEN_2022_PROGRAM_ADDRESS,
	mintAuthority: '9foMHsSDq7nMg4WPusSz9eY7tyxyukqborA8GyU5cUxD',
	freezeAuthority: '51QVCuHfL1FeNjd8BDeffCKhCcAYoULnVB3yjNhShiuK',
	groupData: TSLAON_TOKEN_GROUP
};
