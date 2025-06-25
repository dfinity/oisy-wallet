import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import weth from '$eth/assets/weth.svg';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { WETH_TOKEN_GROUP } from '../groups/groups.weth.env';

const WETH_DECIMALS = 18;

const WETH_SYMBOL = 'WETH';

export const WETH_TOKEN_ID: TokenId = parseTokenId(WETH_SYMBOL);

export const WETH_TOKEN: RequiredAdditionalErc20Token = {
	id: WETH_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Wrapped Ether',
	symbol: WETH_SYMBOL,
	decimals: WETH_DECIMALS,
	icon: weth,
	address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
	exchange: 'erc20',
	groupData: WETH_TOKEN_GROUP
};
