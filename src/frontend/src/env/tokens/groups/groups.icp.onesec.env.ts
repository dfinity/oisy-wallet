import icp from '$icp/assets/icp-onesec.webp';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const ICP_ONESEC_TOKEN_GROUP_SYMBOL = 'ICP';

export const ICP_ONESEC_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(
	ICP_ONESEC_TOKEN_GROUP_SYMBOL
);

export const ICP_ONESEC_TOKEN_GROUP: TokenGroupData = {
	id: ICP_ONESEC_TOKEN_GROUP_ID,
	icon: icp,
	name: 'ICP (Onesec)',
	symbol: ICP_ONESEC_TOKEN_GROUP_SYMBOL
};
