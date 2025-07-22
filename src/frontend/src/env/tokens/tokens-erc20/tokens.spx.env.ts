import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { SPX_TOKEN_GROUP } from '$env/tokens/groups/groups.spx.env';
import spx from '$eth/assets/spx.png';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const SPX_DECIMALS = 8;

const SPX_SYMBOL = 'SPX';

export const SPX_TOKEN_ID: TokenId = parseTokenId(SPX_SYMBOL);

export const SPX_TOKEN: RequiredAdditionalErc20Token = {
	id: SPX_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'SPX6900',
	symbol: SPX_SYMBOL,
	decimals: SPX_DECIMALS,
	icon: spx,
	address: '0xe0f63a424a4439cbe457d80e4f4b51ad25b2c56c',
	exchange: 'erc20',
	groupData: SPX_TOKEN_GROUP
};
