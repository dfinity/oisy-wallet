import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';
import icp from '$icp/assets/icp-light.svg';

const ICP_TOKEN_GROUP_SYMBOL = 'ICP';

export const ICP_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(ICP_TOKEN_GROUP_SYMBOL);

export const ICP_TOKEN_GROUP: TokenGroupData = {
	id: ICP_TOKEN_GROUP_ID,
	icon: icp,
	name: 'ICP',
	symbol: ICP_TOKEN_GROUP_SYMBOL
};
