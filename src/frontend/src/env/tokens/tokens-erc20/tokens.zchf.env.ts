import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ZCHF_TOKEN_GROUP } from '$env/tokens/groups/groups.zchf.env';
import zchf from '$eth/assets/zchf.webp';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const ZCHF_DECIMALS = 18;

const ZCHF_SYMBOL = 'ZCHF';

export const ZCHF_TOKEN_ID: TokenId = parseTokenId(ZCHF_SYMBOL);

export const ZCHF_TOKEN: RequiredAdditionalErc20Token = {
	id: ZCHF_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Frankencoin',
	symbol: ZCHF_SYMBOL,
	decimals: ZCHF_DECIMALS,
	icon: zchf,
	address: '0xB58E61C3098d85632Df34EecfB899A1Ed80921cB',
	exchange: 'erc20',
	groupData: ZCHF_TOKEN_GROUP
};
