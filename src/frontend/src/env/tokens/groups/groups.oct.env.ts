import oct from '$icp-eth/assets/oct.svg';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const OCT_TOKEN_GROUP_SYMBOL = 'OCT';

export const OCT_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(OCT_TOKEN_GROUP_SYMBOL);

export const OCT_TOKEN_GROUP: TokenGroupData = {
	id: OCT_TOKEN_GROUP_ID,
	icon: oct,
	name: 'Octopus Network Token',
	symbol: OCT_TOKEN_GROUP_SYMBOL
};
