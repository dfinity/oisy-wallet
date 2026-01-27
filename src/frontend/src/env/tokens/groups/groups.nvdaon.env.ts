import nvdaon from '$eth/assets/nvdaon.webp';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const NVDAON_TOKEN_GROUP_SYMBOL = 'NVDAon';

export const NVDAON_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(NVDAON_TOKEN_GROUP_SYMBOL);

export const NVDAON_TOKEN_GROUP: TokenGroupData = {
	id: NVDAON_TOKEN_GROUP_ID,
	icon: nvdaon,
	name: 'NVIDIA (Ondo Tokenized)',
	symbol: NVDAON_TOKEN_GROUP_SYMBOL
};
