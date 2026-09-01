import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { BAT_TOKEN_GROUP } from '$env/tokens/groups/groups.bat.env';
import bat from '$icp-eth/assets/bat.svg';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { TOKEN_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { RequiredSplToken } from '$sol/types/spl';

export const BAT_DECIMALS = 8;

export const BAT_SYMBOL = 'BAT';

export const BAT_TOKEN_ID: TokenId = parseTokenId(BAT_SYMBOL);

export const BAT_TOKEN: RequiredSplToken = {
	id: BAT_TOKEN_ID,
	network: SOLANA_MAINNET_NETWORK,
	standard: { code: 'spl' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }],
	name: 'Basic Attention Token (Portal)',
	symbol: BAT_SYMBOL,
	decimals: BAT_DECIMALS,
	icon: bat,
	address: 'EPeUFDgHRxs9xxEPVaL6kfGQvCon7jmAWKVUHuux1Tpz',
	owner: TOKEN_PROGRAM_ADDRESS,
	groupData: BAT_TOKEN_GROUP
};
