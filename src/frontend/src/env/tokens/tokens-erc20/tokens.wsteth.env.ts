import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { WSTETH_TOKEN_GROUP } from '$env/tokens/groups/groups.wsteth.env';
import type { RequiredErc20Token } from '$eth/types/erc20';
import wsteth from '$icp-eth/assets/wsteth.svg';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const WSTETH_DECIMALS = 18;

export const WSTETH_SYMBOL = 'wstETH';

export const WSTETH_TOKEN_ID: TokenId = parseTokenId(WSTETH_SYMBOL);

export const WSTETH_TOKEN: RequiredErc20Token = {
	id: WSTETH_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Wrapped liquid staked Ether 2.0',
	symbol: WSTETH_SYMBOL,
	decimals: WSTETH_DECIMALS,
	icon: wsteth,
	address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
	exchange: 'erc20',
	twinTokenSymbol: 'ckWSTETH',
	groupData: WSTETH_TOKEN_GROUP,
	alwaysShowInTokenGroup: true
};
