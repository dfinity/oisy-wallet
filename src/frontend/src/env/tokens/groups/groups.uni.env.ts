import uni from '$icp-eth/assets/uni.svg';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const UNI_TOKEN_GROUP_SYMBOL = 'UNI';

export const UNI_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(UNI_TOKEN_GROUP_SYMBOL);

export const UNI_TOKEN_GROUP: TokenGroupData = {
	id: UNI_TOKEN_GROUP_ID,
	icon: uni,
	name: 'Uniswap',
	symbol: UNI_TOKEN_GROUP_SYMBOL
};
