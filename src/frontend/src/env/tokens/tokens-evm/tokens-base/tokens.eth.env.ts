import {
	BASE_NETWORK,
	BASE_SEPOLIA_NETWORK
} from '$env/networks/networks-evm/networks.evm.base.env';
import {
	BASE_ETH_TOKEN_GROUP,
	BASE_SEPOLIA_ETH_TOKEN_GROUP
} from '$env/tokens/groups/groups.base.env';
import eth from '$icp-eth/assets/eth.svg';
import type { RequiredToken, TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

const BASE_ETH_DECIMALS = 18;

export const BASE_ETH_SYMBOL = 'ETH';

export const BASE_ETH_TOKEN_ID: TokenId = parseTokenId(BASE_ETH_SYMBOL);

export const BASE_ETH_TOKEN: RequiredToken = {
	id: BASE_ETH_TOKEN_ID,
	network: BASE_NETWORK,
	standard: 'ethereum',
	category: 'default',
	name: 'Ethereum',
	symbol: BASE_ETH_SYMBOL,
	decimals: BASE_ETH_DECIMALS,
	icon: eth,
	buy: {
		onramperId: 'eth_base'
	},
	groupData: BASE_ETH_TOKEN_GROUP
};

export const BASE_SEPOLIA_ETH_SYMBOL = 'SepoliaETH';

export const BASE_SEPOLIA_ETH_TOKEN_ID: TokenId = parseTokenId(BASE_SEPOLIA_ETH_SYMBOL);

export const BASE_SEPOLIA_ETH_TOKEN: RequiredToken = {
	id: BASE_SEPOLIA_ETH_TOKEN_ID,
	network: BASE_SEPOLIA_NETWORK,
	standard: 'ethereum',
	category: 'default',
	name: 'SepoliaETH',
	symbol: BASE_SEPOLIA_ETH_SYMBOL,
	decimals: BASE_ETH_DECIMALS,
	icon: eth,
	groupData: BASE_SEPOLIA_ETH_TOKEN_GROUP
};
