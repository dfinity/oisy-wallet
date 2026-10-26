import paxg from '$eth/assets/paxg.png';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const PAXG_TOKEN_GROUP_SYMBOL = 'PAXG';

export const PAXG_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(PAXG_TOKEN_GROUP_SYMBOL);

export const PAXG_TOKEN_GROUP: TokenGroupData = {
	id: PAXG_TOKEN_GROUP_ID,
	icon: paxg,
	name: 'Paxos Gold',
	symbol: PAXG_TOKEN_GROUP_SYMBOL
};
