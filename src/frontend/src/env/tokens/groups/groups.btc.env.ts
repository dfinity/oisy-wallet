import bitcoin from '$btc/assets/bitcoin.svg';
import type { TokenGroupData, TokenGroupId } from '$lib/types/token-group';
import { parseTokenGroupId } from '$lib/validation/token-group.validation';

const BTC_TOKEN_GROUP_SYMBOL = 'BTC';

export const BTC_TOKEN_GROUP_ID: TokenGroupId = parseTokenGroupId(BTC_TOKEN_GROUP_SYMBOL);

export const BTC_TOKEN_GROUP: TokenGroupData = {
	id: BTC_TOKEN_GROUP_ID,
	icon: bitcoin,
	name: 'Bitcoin',
	symbol: BTC_TOKEN_GROUP_SYMBOL
};
