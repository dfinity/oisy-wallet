import wsteth from '$icp-eth/assets/wsteth.svg';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const WSTETH_TOKEN_GROUP_SYMBOL = 'wstETH';

export const WSTETH_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(WSTETH_TOKEN_GROUP_SYMBOL);

export const WSTETH_TOKEN_GROUP: TokenGroupData = {
	id: WSTETH_TOKEN_GROUP_ID,
	icon: wsteth,
	name: 'Wrapped liquid staked Ether 2.0',
	symbol: WSTETH_TOKEN_GROUP_SYMBOL
};
