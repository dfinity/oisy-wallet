import { ARBITRUM_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { WETH_TOKEN_GROUP } from '$env/tokens/groups/groups.weth.env';
import weth from '$eth/assets/weth.svg';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const WETH_DECIMALS = 18;

const WETH_SYMBOL = 'WETH';

export const WETH_TOKEN_ID: TokenId = parseTokenId(WETH_SYMBOL);

export const WETH_TOKEN: RequiredAdditionalErc20Token = {
	id: WETH_TOKEN_ID,
	network: ARBITRUM_MAINNET_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Wrapped Ether',
	symbol: WETH_SYMBOL,
	decimals: WETH_DECIMALS,
	icon: weth,
	address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
	exchange: 'erc20',
	groupData: WETH_TOKEN_GROUP
};
