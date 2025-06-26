import weth from '$eth/assets/weth.svg';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const WETH_TOKEN_GROUP_SYMBOL = 'WETH';

export const WETH_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(WETH_TOKEN_GROUP_SYMBOL);

export const WETH_TOKEN_GROUP: TokenGroupData = {
	id: WETH_TOKEN_GROUP_ID,
	icon: weth,
	name: 'Wrapped Ether',
	symbol: WETH_TOKEN_GROUP_SYMBOL
};
