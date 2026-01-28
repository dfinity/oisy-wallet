import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { JPYC_TOKEN_GROUP } from '$env/tokens/groups/groups.jpyc.env';
import jpyc from '$eth/assets/jpyc.webp';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const JPYC_DECIMALS = 18;

const JPYC_SYMBOL = 'NVDAon';

export const JPYC_TOKEN_ID: TokenId = parseTokenId(JPYC_SYMBOL);

export const JPYC_TOKEN: RequiredAdditionalErc20Token = {
	id: JPYC_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: { code: 'erc20' },
	category: 'default',
	name: 'JPY Coin',
	symbol: JPYC_SYMBOL,
	decimals: JPYC_DECIMALS,
	icon: jpyc,
	address: '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB',
	exchange: 'erc20',
	groupData: JPYC_TOKEN_GROUP
};
