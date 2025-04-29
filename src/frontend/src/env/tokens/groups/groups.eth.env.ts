import eth from '$icp-eth/assets/eth.svg';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const ETH_TOKEN_GROUP_SYMBOL = 'ETH';

export const ETH_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(ETH_TOKEN_GROUP_SYMBOL);

export const ETH_TOKEN_GROUP: TokenGroupData = {
	id: ETH_TOKEN_GROUP_ID,
	icon: eth,
	name: 'Ethereum',
	symbol: ETH_TOKEN_GROUP_SYMBOL
};
