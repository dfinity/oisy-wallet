import armon from '$eth/assets/armon.png';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const ARMON_TOKEN_GROUP_SYMBOL = 'ARMon';

export const ARMON_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(ARMON_TOKEN_GROUP_SYMBOL);

export const ARMON_TOKEN_GROUP: TokenGroupData = {
	id: ARMON_TOKEN_GROUP_ID,
	icon: armon,
	name: 'Arm Holdings plc (Ondo Tokenized)',
	symbol: ARMON_TOKEN_GROUP_SYMBOL
};
